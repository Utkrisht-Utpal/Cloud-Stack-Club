import React from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  gradientBorder?: boolean; // kept for API compat, no longer used
  glowOnHover?: boolean;    // kept for API compat, no longer used
  children: React.ReactNode;
}

/** Global card — Neumorphism (Soft UI) style throughout the site. */
export const Card: React.FC<CardProps> = ({
  children,
  className,
  gradientBorder: _g,
  glowOnHover: _h,
  ...props
}) => {
  return (
    <div
      className={cn('neumorphic-card p-6 transition-all duration-300 group', className)}
      {...props}
    >
      {children}
    </div>
  );
};
