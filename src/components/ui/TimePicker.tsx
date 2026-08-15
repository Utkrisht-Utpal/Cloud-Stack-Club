import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, RotateCcw } from 'lucide-react';

interface TimePickerProps {
  value: string; // "HH:mm" e.g. "10:00" or "14:30"
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select Time',
  className = '',
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [portalStyle, setPortalStyle] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    dropUp: boolean;
  } | null>(null);

  // Parse current 24-hour value into 12-hour format parts
  const parseTime = (timeStr: string) => {
    if (!timeStr) return { hour12: '10', minute: '00', period: 'AM' };
    const [h, m] = timeStr.split(':').map((s) => parseInt(s, 10) || 0);
    const period = h >= 12 ? 'PM' : 'AM';
    let hour12 = h % 12;
    if (hour12 === 0) hour12 = 12;
    const hourStr = String(hour12).padStart(2, '0');
    const minStr = String(Math.floor(m / 5) * 5).padStart(2, '0');
    return { hour12: hourStr, minute: minStr, period };
  };

  const currentParsed = parseTime(value);

  // Floating portal positioning
  useEffect(() => {
    if (!isOpen) {
      setPortalStyle(null);
      return;
    }

    const updatePos = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const shouldDropUp = spaceBelow < 280 && rect.top > 280;

      if (shouldDropUp) {
        setPortalStyle({
          bottom: viewportHeight - rect.top + 6,
          left: Math.max(16, Math.min(rect.left, window.innerWidth - 260)),
          width: Math.max(260, rect.width),
          dropUp: true,
        });
      } else {
        setPortalStyle({
          top: rect.bottom + 6,
          left: Math.max(16, Math.min(rect.left, window.innerWidth - 260)),
          width: Math.max(260, rect.width),
          dropUp: false,
        });
      }
    };

    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);

    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const convertTo24 = (h12: string, min: string, p: string) => {
    let h = parseInt(h12, 10);
    if (p === 'PM' && h < 12) h += 12;
    if (p === 'AM' && h === 12) h = 0;
    const hStr = String(h).padStart(2, '0');
    return `${hStr}:${min}`;
  };

  const handleSelectHour = (hStr: string) => {
    const newTime = convertTo24(hStr, currentParsed.minute, currentParsed.period);
    onChange(newTime);
  };

  const handleSelectMinute = (mStr: string) => {
    const newTime = convertTo24(currentParsed.hour12, mStr, currentParsed.period);
    onChange(newTime);
  };

  const handleSelectPeriod = (p: string) => {
    const newTime = convertTo24(currentParsed.hour12, currentParsed.minute, p);
    onChange(newTime);
  };

  const handleNow = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0');
    onChange(`${h}:${m}`);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const hoursList = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const minutesList = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  const formattedDisplay = value
    ? (() => {
        const { hour12, minute, period } = parseTime(value);
        return `${hour12}:${minute} ${period}`;
      })()
    : placeholder;

  const defaultTriggerClass = `w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 text-sm border flex items-center justify-between transition-all duration-200 cursor-pointer ${
    isOpen
      ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-sm'
      : 'border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'
  } ${value ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-400 dark:text-slate-500'}`;

  return (
    <div className="relative space-y-1" ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
          {label}
        </label>
      )}

      {/* Trigger Box */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={className || defaultTriggerClass}
      >
        <span className="flex items-center gap-2.5 truncate">
          <Clock className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" />
          <span className="truncate">{formattedDisplay}</span>
        </span>
      </button>

      {/* Floating Time Picker Popover */}
      {isOpen &&
        portalStyle &&
        createPortal(
          <AnimatePresence>
            <motion.div
              ref={popoverRef}
              initial={{ opacity: 0, scale: 0.95, y: portalStyle.dropUp ? 6 : -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: portalStyle.dropUp ? 6 : -6 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                top: portalStyle.top !== undefined ? `${portalStyle.top}px` : 'auto',
                bottom: portalStyle.bottom !== undefined ? `${portalStyle.bottom}px` : 'auto',
                left: `${portalStyle.left}px`,
                width: `${portalStyle.width}px`,
                zIndex: 99999,
              }}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 space-y-3 font-sans text-slate-900 dark:text-white focus:outline-none"
            >
              <div className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span>Select Time</span>
                <span className="text-blue-600 dark:text-sky-400 font-bold">
                  {currentParsed.hour12}:{currentParsed.minute} {currentParsed.period}
                </span>
              </div>

              {/* Column Selection: Hours | Minutes | AM/PM */}
              <div className="grid grid-cols-3 gap-2">
                {/* Hours Column */}
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase text-center">
                    Hour
                  </span>
                  <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {hoursList.map((h) => {
                      const isSel = currentParsed.hour12 === h;
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => handleSelectHour(h)}
                          className={`w-full py-1.5 rounded-lg text-xs font-semibold text-center transition-all ${
                            isSel
                              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {h}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Minutes Column */}
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase text-center">
                    Minute
                  </span>
                  <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {minutesList.map((m) => {
                      const isSel = currentParsed.minute === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleSelectMinute(m)}
                          className={`w-full py-1.5 rounded-lg text-xs font-semibold text-center transition-all ${
                            isSel
                              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          :{m}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Period Column (AM / PM) */}
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase text-center">
                    Period
                  </span>
                  <div className="space-y-1 pt-1">
                    {['AM', 'PM'].map((p) => {
                      const isSel = currentParsed.period === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handleSelectPeriod(p)}
                          className={`w-full py-2.5 rounded-xl text-xs font-bold text-center transition-all ${
                            isSel
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Clear & Now */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear</span>
                </button>

                <button
                  type="button"
                  onClick={handleNow}
                  className="text-blue-600 dark:text-sky-400 hover:underline font-bold"
                >
                  Now
                </button>
              </div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};
