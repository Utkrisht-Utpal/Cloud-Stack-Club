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
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none';

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98]',
    secondary:
      'bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 border border-slate-700/50 shadow-md',
    outline:
      'border border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/80',
    glass:
      'bg-[#e6ecf5] dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 shadow-[4px_4px_12px_rgba(163,177,198,0.5),-4px_-4px_12px_#ffffff] dark:shadow-none dark:border dark:border-slate-700/80 hover:bg-[#ebf1fb] dark:hover:bg-slate-800 font-semibold',
    ghost:
      'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50',
  };

  const sizeStyles = {
    sm: 'px-3.5 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-7 py-3.5 text-base gap-2.5 font-semibold',
  };

  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      {...props}
    >
      {icon && iconPosition === 'left' && <span className="inline-block">{icon}</span>}
      <span>{children}</span>
      {icon && iconPosition === 'right' && <span className="inline-block">{icon}</span>}
    </motion.button>
  );
};
