import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import { useClickOutside } from "../../hooks/useClickOutside";

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
  leadingIcon?: React.ReactNode;
  showDot?: boolean;
  triggerClassName?: string;
  minMenuWidth?: number;
  align?: 'left' | 'right';
  dropDirection?: 'auto' | 'down' | 'up';
  clearable?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = "Select option",
  icon,
  leadingIcon,
  showDot = false,
  triggerClassName,
  minMenuWidth,
  align = 'left',
  dropDirection = 'down',
  clearable = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [portalStyle, setPortalStyle] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight?: number;
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

      // If the trigger button scrolled completely out of view, close the menu
      if (rect.bottom < 0 || rect.top > viewportHeight) {
        setIsOpen(false);
        return;
      }

      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldDropUp =
        dropDirection === 'up'
          ? true
          : dropDirection === 'down'
          ? false
          : spaceBelow < 160 && spaceAbove > 180;

      const maxHeight = shouldDropUp
        ? Math.min(260, Math.max(100, spaceAbove - 16))
        : Math.min(260, Math.max(100, spaceBelow - 16));

      // Sized in accordance with the trigger button width
      const targetMin = minMenuWidth ?? rect.width;
      const menuWidth = Math.min(viewportWidth - 24, Math.max(rect.width, targetMin));

      let menuLeft = align === 'right' ? rect.right - menuWidth : rect.left;
      if (menuLeft + menuWidth > viewportWidth - 12) {
        menuLeft = Math.max(12, viewportWidth - menuWidth - 12);
      }
      if (menuLeft < 12) {
        menuLeft = 12;
      }

      if (shouldDropUp) {
        setPortalStyle({
          bottom: viewportHeight - rect.top + 4,
          left: menuLeft,
          width: menuWidth,
          maxHeight,
          dropUp: true,
        });
      } else {
        setPortalStyle({
          top: rect.bottom + 4,
          left: menuLeft,
          width: menuWidth,
          maxHeight,
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
  }, [isOpen, minMenuWidth, align, dropDirection]);

  useClickOutside({
    enabled: isOpen,
    onClose: () => setIsOpen(false),
    refs: [containerRef, menuRef],
    closeOnEsc: true,
  });

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
        className={
          triggerClassName
            ? `${triggerClassName} ${
                isOpen
                  ? "!border-blue-500 !ring-2 !ring-blue-500/25 dark:!border-sky-400 dark:!ring-sky-400/25 shadow-sm"
                  : ""
              }`
            : defaultTriggerClass
        }
      >
        <span className={`text-xs sm:text-sm font-medium flex items-center gap-2 text-left min-w-0 flex-1 whitespace-nowrap ${triggerClassName ? 'text-inherit font-inherit' : 'text-slate-900 dark:text-slate-100'}`}>
          {leadingIcon && (
            <span className="shrink-0 flex items-center">
              {leadingIcon}
            </span>
          )}
          {showDot && (
            <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-sky-400 shrink-0" />
          )}
          <span className={`whitespace-nowrap truncate ${!selectedOption ? 'text-slate-400 dark:text-slate-500' : ''}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <div className="flex items-center shrink-0 ml-1.5">
          {clearable && selectedOption && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onChange("");
                }
              }}
              className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors mr-1 cursor-pointer"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-300 shrink-0 ${
              triggerClassName ? 'text-inherit opacity-75' : 'text-blue-600 dark:text-sky-400'
            } ${isOpen ? 'rotate-180' : 'rotate-0'}`}
          />
        </div>
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
                y: portalStyle.dropUp ? 6 : -6,
                scale: 0.98,
              }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: portalStyle.dropUp ? 6 : -6, scale: 0.98 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
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
                maxHeight: portalStyle.maxHeight ? `${portalStyle.maxHeight}px` : undefined,
                zIndex: 99999,
              }}
              className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 shadow-2xl rounded-2xl p-1.5 space-y-1 overflow-y-auto max-h-56 custom-scrollbar overscroll-contain focus:outline-none"
            >
              {options.length === 0 ? (
                <div className="py-2.5 px-3 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
                  No options available
                </div>
              ) : (
                options.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left transition-all flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-sky-300"
                      }`}
                    >
                      <div className="flex flex-col text-left min-w-0 flex-1">
                        <span className="text-xs font-bold text-left truncate">
                          {option.label}
                        </span>
                        {option.description && (
                          <span
                            className={`text-[10px] text-left leading-tight mt-0.5 truncate ${
                              isSelected
                                ? "text-blue-100"
                                : "text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {option.description}
                          </span>
                        )}
                      </div>
                      {option.badge && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 transition-colors ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-500/20"
                          }`}
                        >
                          {option.badge}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
};
