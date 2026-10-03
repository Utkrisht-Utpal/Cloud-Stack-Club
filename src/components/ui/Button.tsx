import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../../utils/cn';

export interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'glass' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'right',
  children,
  className,
  type = 'button',
  ...props
}) => {
  const baseStyles =
    'group relative inline-flex items-center justify-center font-medium transition-all duration-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none';

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 text-white font-semibold shadow-[0_4px_12px_rgba(37,99,235,0.22)] dark:shadow-[0_4px_14px_rgba(0,0,0,0.5),0_0_12px_rgba(37,99,235,0.2)] hover:shadow-[0_6px_18px_rgba(37,99,235,0.32)] dark:hover:shadow-[0_6px_18px_rgba(0,0,0,0.6),0_0_16px_rgba(37,99,235,0.3)] hover:brightness-105 active:scale-[0.985] active:brightness-95',
    secondary:
      'bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 border border-slate-700/60 shadow-sm hover:shadow-md',
    outline:
      'border border-blue-500/40 text-blue-600 dark:text-blue-400 bg-transparent hover:bg-blue-500/10 hover:border-blue-500/80 shadow-sm hover:shadow',
    glass:
      'bg-[#e6ecf5] dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:bg-[#ebf1fb] dark:hover:bg-slate-800 font-semibold',
    ghost:
      'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60',
  };

  const sizeStyles = {
    sm: 'px-3.5 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-7 py-3.5 text-base gap-2.5 font-semibold',
  };

  return (
    <motion.button
      type={type}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      {...props}
    >
      {icon && iconPosition === 'left' && (
        <span className="inline-flex items-center shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5">
          {icon}
        </span>
      )}
      <span className="relative z-10">{children}</span>
      {icon && iconPosition === 'right' && (
        <span className="inline-flex items-center shrink-0 transition-transform duration-200 group-hover:translate-x-1">
          {icon}
        </span>
      )}
    </motion.button>
  );
};
