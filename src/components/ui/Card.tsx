import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../../utils/cn';

export interface CardProps extends HTMLMotionProps<'div'> {
  gradientBorder?: boolean;
  glowOnHover?: boolean;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  gradientBorder = true,
  glowOnHover = true,
  children,
  className,
  ...props
}) => {
  return (
    <motion.div
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className={cn(
        'rounded-2xl p-6 transition-all duration-300',
        gradientBorder ? 'gradient-border-card' : 'glass-panel',
        glowOnHover && 'hover:shadow-2xl hover:shadow-blue-500/10 dark:hover:shadow-sky-500/15',
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};
