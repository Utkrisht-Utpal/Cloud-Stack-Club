import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  badge?: string;
}

interface CustomSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  icon?: React.ReactNode;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select domain',
  icon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative space-y-1.5" ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          {icon}
          {label}
        </label>
      )}

      {/* Select Trigger Box */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 rounded-2xl glass-panel bg-slate-900/90 text-white flex items-center justify-between transition-all duration-300 border ${
          isOpen ? 'border-sky-500 ring-2 ring-sky-500/30 shadow-lg shadow-sky-500/10' : 'border-slate-700/60 hover:border-slate-600'
        }`}
      >
        <span className="text-sm font-medium text-slate-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-400" />
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-sky-400 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>

      {/* Animated Dropdown Menu with fixed max height & internal scrolling */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 right-0 z-50 rounded-2xl glass-panel bg-slate-900/95 backdrop-blur-xl border border-sky-500/30 shadow-2xl p-1.5 space-y-1 overflow-y-auto max-h-52 no-scrollbar focus:outline-none"
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
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white font-semibold shadow-md'
                      : 'text-slate-200 hover:bg-slate-800/80 hover:text-sky-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {option.label}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-white" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
