import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  min?: string;
  max?: string;
  label?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select Date',
  className = '',
  min,
  max,
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Parsed current value or today's date for initial view
  const parsedValueDate = value ? new Date(value + 'T00:00:00') : null;
  const initialViewDate = parsedValueDate || new Date();

  const [viewYear, setViewYear] = useState<number>(initialViewDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialViewDate.getMonth()); // 0 - 11

  const [portalStyle, setPortalStyle] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    dropUp: boolean;
  } | null>(null);

  // Sync view when value changes
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  // Position calculation for floating popover
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
      const shouldDropUp = spaceBelow < 340 && rect.top > 340;

      if (shouldDropUp) {
        setPortalStyle({
          bottom: viewportHeight - rect.top + 6,
          left: Math.max(16, Math.min(rect.left, window.innerWidth - 300)),
          width: Math.max(280, rect.width),
          dropUp: true,
        });
      } else {
        setPortalStyle({
          top: rect.bottom + 6,
          left: Math.max(16, Math.min(rect.left, window.innerWidth - 300)),
          width: Math.max(280, rect.width),
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

  // Close on click outside
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

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const monthStr = String(viewMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const formattedDate = `${viewYear}-${monthStr}-${dayStr}`;
    onChange(formattedDate);
    setIsOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const monthStr = String(today.getMonth() + 1).padStart(2, '0');
    const dayStr = String(today.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${monthStr}-${dayStr}`;
    setViewYear(year);
    setViewMonth(today.getMonth());
    onChange(formattedDate);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  // Calendar math
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();

  const formattedDisplay = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
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
          {label.includes('*') ? (
            <>
              {label.replace(/\s*\*/, '')} <span className="text-red-500 font-bold">*</span>
            </>
          ) : (
            label
          )}
        </label>
      )}

      {/* Input Trigger Box */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={className || defaultTriggerClass}
      >
        <span className="flex items-center gap-2.5 truncate">
          <Calendar className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" />
          <span className="truncate">{formattedDisplay}</span>
        </span>
      </button>

      {/* Floating Calendar Popover */}
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
              {/* Header: Month/Year & Navigation */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  {monthNames[viewMonth]} {viewYear}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day of Week Header */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {dayNames.map((d) => (
                  <span key={d} className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 py-1">
                    {d}
                  </span>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {/* Empty slots for previous month padding */}
                {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="h-8" />
                ))}

                {/* Days of current month */}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const day = idx + 1;
                  const monthStr = String(viewMonth + 1).padStart(2, '0');
                  const dayStr = String(day).padStart(2, '0');
                  const dateStr = `${viewYear}-${monthStr}-${dayStr}`;

                  const isSelected = value === dateStr;
                  const isToday =
                    todayYear === viewYear && todayMonth === viewMonth && todayDate === day;

                  const isDisabled = Boolean((min && dateStr < min) || (max && dateStr > max));

                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleSelectDay(day)}
                      className={`h-8 w-8 mx-auto rounded-xl flex items-center justify-center font-semibold transition-all duration-150 ${
                        isDisabled
                          ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-40'
                          : isSelected
                          ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/30 scale-105'
                          : isToday
                          ? 'border border-blue-500 text-blue-600 dark:text-sky-400 font-bold hover:bg-blue-50 dark:hover:bg-blue-900/30'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons: Today & Clear */}
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
                  onClick={handleToday}
                  className="text-blue-600 dark:text-sky-400 hover:underline font-bold"
                >
                  Today
                </button>
              </div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};
