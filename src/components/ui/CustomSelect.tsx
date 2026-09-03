import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
}

interface CustomSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  icon?: React.ReactNode;
  showDot?: boolean;
  triggerClassName?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = "Select option",
  icon,
  showDot = false,
  triggerClassName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [portalStyle, setPortalStyle] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    dropUp: boolean;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (!isOpen) {
      setPortalStyle(null);
      return;
    }

    const updatePos = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const spaceBelow = viewportHeight - rect.bottom;
      const shouldDropUp = spaceBelow < 220 && rect.top > 200;
      const menuWidth = rect.width;
      let menuLeft = rect.left;
      if (menuLeft + menuWidth > viewportWidth - 12) {
        menuLeft = Math.max(12, viewportWidth - menuWidth - 12);
      }

      if (shouldDropUp) {
        setPortalStyle({
          bottom: viewportHeight - rect.top + 4,
          left: menuLeft,
          width: menuWidth,
          dropUp: true,
        });
      } else {
        setPortalStyle({
          top: rect.bottom + 4,
          left: menuLeft,
          width: menuWidth,
          dropUp: false,
        });
      }
    };

    updatePos();

    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);

    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const defaultTriggerClass = `w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900/90 text-slate-900 dark:text-white flex items-center justify-between transition-all duration-300 border ${
    isOpen
      ? "border-blue-500 ring-2 ring-blue-500/30 shadow-md"
      : "border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600"
  }`;

  return (
    <div className="relative space-y-1.5" ref={containerRef}>
      {label && (
        <label
          htmlFor="yos"
          className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
        >
          {icon}
          {label.includes('*') ? (
            <>
              {label.replace(/\s*\*/, '')} <span className="text-red-500 font-bold">*</span>
            </>
          ) : (
            label
          )}
        </label>
      )}

      {/* Select Trigger Box */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={triggerClassName || defaultTriggerClass}
      >
        <span className={`text-xs sm:text-sm font-medium flex items-center gap-2 text-left min-w-0 flex-1 whitespace-nowrap ${triggerClassName ? 'text-inherit' : 'text-slate-900 dark:text-slate-100'}`}>
          {showDot && (
            <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-sky-400 shrink-0" />
          )}
          <span className="whitespace-nowrap truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-300 shrink-0 ml-1.5 ${
            triggerClassName ? 'text-inherit opacity-80' : 'text-blue-600 dark:text-sky-400'
          } ${isOpen ? 'rotate-180' : 'rotate-0'}`}
        />
      </button>

      {/* React Portal Floating Dropdown Menu */}
      {isOpen &&
        portalStyle &&
        createPortal(
          <AnimatePresence>
            <motion.div
              ref={menuRef}
              initial={{
                opacity: 0,
                y: portalStyle.dropUp ? 8 : -8,
                scale: 0.98,
              }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: portalStyle.dropUp ? 8 : -8, scale: 0.98 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={{
                position: "fixed",
                top:
                  portalStyle.top !== undefined
                    ? `${portalStyle.top}px`
                    : "auto",
                bottom:
                  portalStyle.bottom !== undefined
                    ? `${portalStyle.bottom}px`
                    : "auto",
                left: `${portalStyle.left}px`,
                width: `${portalStyle.width}px`,
                zIndex: 99999,
              }}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-1.5 space-y-1 overflow-y-auto max-h-48 custom-scrollbar focus:outline-none"
            >
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-left transition-all flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? "bg-blue-600 text-white font-semibold shadow-md"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-sky-300"
                    }`}
                  >
                    <div className="flex flex-col text-left min-w-0 flex-1 whitespace-nowrap">
                      <span className="text-xs sm:text-sm font-bold text-left whitespace-nowrap">
                        {option.label}
                      </span>
                      {option.description && (
                        <span
                          className={`text-[10px] sm:text-xs text-left leading-tight mt-0.5 whitespace-nowrap ${
                            isSelected
                              ? "text-blue-100"
                              : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {option.description}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
};
