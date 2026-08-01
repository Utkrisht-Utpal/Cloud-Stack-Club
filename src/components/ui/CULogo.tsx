import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import cuLogoLight from '../../assets/images/cu-logo-light.png';
import cuLogoDark from '../../assets/images/cu-logo-dark.png';

interface CULogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CULogo: React.FC<CULogoProps> = ({
  className = '',
  size = 'md',
}) => {
  const { theme } = useTheme();

  // Natural aspect ratio scaling without forced width or squishing
  const sizeClasses = {
    sm: 'h-7 sm:h-8 w-auto object-contain',
    md: 'h-9 sm:h-11 w-auto object-contain',
    lg: 'h-12 sm:h-14 w-auto object-contain',
  };

  const currentLogo = theme === 'dark' ? cuLogoDark : cuLogoLight;

  return (
    <div className={`inline-flex items-center shrink-0 ${className}`}>
      <img
        src={currentLogo}
        alt="Chandigarh University Logo"
        className={`${sizeClasses[size]} drop-shadow-sm transition-opacity duration-300`}
      />
    </div>
  );
};
