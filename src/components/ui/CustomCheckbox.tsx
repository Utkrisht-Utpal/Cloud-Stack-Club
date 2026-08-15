import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface CustomCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  id?: string;
  className?: string;
  disabled?: boolean;
}

export const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
  checked,
  onChange,
  label,
  id,
  className = '',
  disabled = false,
}) => {
  const toggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <div
      onClick={toggle}
      role="checkbox"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      className={`group flex items-center gap-2.5 cursor-pointer select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      <div
        id={id}
        className={`w-5 h-5 rounded-lg border transition-all duration-200 flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
          checked
            ? 'bg-gradient-to-br from-blue-600 to-indigo-600 border-blue-600 text-white shadow-sm shadow-blue-500/30 scale-100'
            : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700/80 group-hover:border-blue-400 dark:group-hover:border-slate-500'
        }`}
      >
        {checked && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
          </motion.div>
        )}
      </div>

      {label && (
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-sky-300 transition-colors">
          {label}
        </span>
      )}
    </div>
  );
};
