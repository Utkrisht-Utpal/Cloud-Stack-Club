import React from 'react';
import clubLogoImg from '../../assets/images/club-logo-transparent.png';

interface ClubLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const ClubLogo: React.FC<ClubLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
}) => {
  const sizeMap = {
    sm: 'h-9 w-auto',
    md: 'h-12 w-auto',
    lg: 'h-16 w-auto',
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
        <div className="flex flex-col">
          <span className="font-black text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
            Cloud Stack <span className="text-blue-600 dark:text-sky-400">Club</span>
          </span>
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-widest uppercase">
            Chandigarh University
          </span>
        </div>
      )}
    </div>
  );
};
