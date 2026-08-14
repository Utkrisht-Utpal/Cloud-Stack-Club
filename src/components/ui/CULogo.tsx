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
    <a
      href="https://www.cuchd.in/"
      target="_blank"
      rel="noopener noreferrer"
      title="Chandigarh University Official Website"
      className={`inline-flex items-center shrink-0 hover:opacity-90 transition-opacity group cursor-pointer ${className}`}
    >
      <img
        src={currentLogo}
        alt="Chandigarh University Logo"
        className={`${sizeClasses[size]} drop-shadow-sm transition-transform duration-300 group-hover:scale-[1.02]`}
      />
    </a>
  );
};
