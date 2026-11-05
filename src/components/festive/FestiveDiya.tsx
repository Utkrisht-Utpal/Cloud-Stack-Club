import React from 'react';
import { motion } from 'framer-motion';
import { triggerDiwaliFireworks } from '../../utils/diwaliFireworks';

interface FestiveDiyaProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  showTooltip?: boolean;
}

export const FestiveDiya: React.FC<FestiveDiyaProps> = ({
  size = 'md',
  className = '',
  onClick,
  showTooltip = false,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) onClick();
    triggerDiwaliFireworks();
  };

  const scaleMap = {
    sm: { width: 36, height: 18, flameW: 'w-3', flameH: 'h-5', glow: 'w-10 h-10' },
    md: { width: 48, height: 24, flameW: 'w-4', flameH: 'h-7', glow: 'w-14 h-14' },
    lg: { width: 64, height: 32, flameW: 'w-5', flameH: 'h-9', glow: 'w-20 h-20' },
  };

  const config = scaleMap[size];

  return (
    <motion.div
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.94 }}
      onClick={handleClick}
      className={`group relative cursor-pointer flex flex-col items-center select-none ${className}`}
      title="Click to celebrate Diwali! 🪔✨"
    >
      {/* Flame Ambient Glow */}
      <div
        className={`absolute -top-6 ${config.glow} rounded-full bg-amber-500/35 blur-xl pointer-events-none group-hover:scale-125 transition-transform`}
      />

      {/* Animated Flickering Flame */}
      <motion.div
        animate={{
          scaleY: [1, 1.16, 0.93, 1.14, 1],
          scaleX: [1, 0.93, 1.07, 0.95, 1],
          rotate: [0, -2, 3, -1, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 1.4,
          ease: 'easeInOut',
        }}
        className={`relative z-10 ${config.flameW} ${config.flameH} -mb-1 flex items-center justify-center`}
      >
        {/* Outer Flame (Orange to Warm Yellow) */}
        <div className="w-full h-full rounded-full bg-gradient-to-t from-orange-600 via-amber-400 to-yellow-200 blur-[0.4px] shadow-[0_0_14px_rgba(251,191,36,0.95)]" />
        {/* Inner Flame Core (White-hot energy) */}
        <div className="absolute bottom-1 w-1.5 h-3 rounded-full bg-white blur-[0.2px]" />
      </motion.div>

      {/* Terracotta / Brass Diya Body */}
      <svg
        width={config.width}
        height={config.height}
        viewBox="0 0 48 24"
        className="drop-shadow-md overflow-visible"
      >
        <defs>
          <linearGradient id="festiveDiyaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="50%" stopColor="#c2410c" />
            <stop offset="100%" stopColor="#7c2d12" />
          </linearGradient>
          <linearGradient id="festiveGoldRim" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>

        {/* Base Lamp Bowl */}
        <path
          d="M 4 8 C 8 20 40 20 44 8 C 36 12 12 12 4 8 Z"
          fill="url(#festiveDiyaGrad)"
          stroke="#7c2d12"
          strokeWidth="0.8"
        />

        {/* Golden Rim */}
        <ellipse cx="24" cy="8" rx="20" ry="3.5" fill="url(#festiveGoldRim)" />

        {/* Central Wick Base */}
        <ellipse cx="24" cy="8" rx="4" ry="1.5" fill="#451a03" />
      </svg>

      {/* Warm Floor Light Reflection */}
      <div className="w-12 h-2 rounded-full bg-amber-500/25 blur-xs -mt-1" />

      {/* Optional Hover Tooltip */}
      {showTooltip && (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/95 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md shadow-lg pointer-events-none whitespace-nowrap z-20 border border-amber-500/30">
          Light Diya 🪔
        </div>
      )}
    </motion.div>
  );
};
