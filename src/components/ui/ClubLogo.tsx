import React from 'react';
import clubLogoImg from '../../assets/images/club-logo-transparent.png';

interface ClubLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const ClubLogo: React.FC<ClubLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
}) => {
  // Increased sizes globally as requested
  const sizeMap = {
    sm: 'h-12 w-auto',
    md: 'h-16 w-auto',
    lg: 'h-24 w-auto',
    xl: 'h-32 w-auto',
  };

  const textMap = {
    sm: { main: 'text-lg', sub: 'text-[10px]' },
    md: { main: 'text-xl sm:text-2xl', sub: 'text-xs' },
    lg: { main: 'text-3xl sm:text-4xl', sub: 'text-sm' },
    xl: { main: 'text-4xl sm:text-5xl', sub: 'text-base' },
  };

  return (
    <div className={`flex items-center gap-3 group ${className}`}>
      <div className="relative flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
        <img
          src={clubLogoImg}
          alt="Cloud Stack Club Logo"
          className={`${sizeMap[size]} object-contain drop-shadow-md`}
        />
      </div>
      {showText && (
        <div className="flex flex-col justify-center">
          <span
            className={`font-black ${textMap[size].main} tracking-tight text-slate-900 dark:text-white flex items-center gap-1 leading-none mb-1`}
          >
            Cloud Stack <span className="text-blue-600 dark:text-sky-400">Club</span>
          </span>
          <span
            className={`${textMap[size].sub} font-extrabold text-slate-600 dark:text-slate-400 tracking-widest uppercase leading-none`}
          >
            Chandigarh University
          </span>
        </div>
      )}
    </div>
  );
};


