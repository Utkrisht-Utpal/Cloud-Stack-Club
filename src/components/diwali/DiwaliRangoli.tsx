import React from 'react';
import { motion } from 'framer-motion';

export const DiwaliRangoli: React.FC = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10 overflow-hidden">
      {/* Warm Ambient Golden Halo */}
      <div className="absolute w-[500px] sm:w-[650px] h-[500px] sm:h-[650px] rounded-full bg-gradient-to-tr from-amber-500/20 via-orange-500/15 to-yellow-400/10 blur-3xl animate-pulse" />

      {/* Rotating Sacred Rangoli Mandala */}
      <motion.svg
        animate={{ rotate: 360 }}
        transition={{ duration: 75, repeat: Infinity, ease: 'linear' }}
        viewBox="0 0 400 400"
        className="w-[420px] sm:w-[600px] h-[420px] sm:h-[600px] opacity-35 dark:opacity-45 select-none"
      >
        <defs>
          <linearGradient id="rangoliGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#ea580c" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="rangoliGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>

        {/* Concentric Circles & Petals */}
        <circle cx="200" cy="200" r="180" fill="none" stroke="url(#rangoliGold)" strokeWidth="1" strokeDasharray="4 6" />
        <circle cx="200" cy="200" r="160" fill="none" stroke="url(#rangoliGold)" strokeWidth="1.5" />
        <circle cx="200" cy="200" r="140" fill="none" stroke="url(#rangoliGold)" strokeWidth="0.8" strokeDasharray="3 3" />
        <circle cx="200" cy="200" r="100" fill="none" stroke="url(#rangoliGold)" strokeWidth="1.5" />
        <circle cx="200" cy="200" r="60" fill="none" stroke="url(#rangoliGold)" strokeWidth="1" strokeDasharray="2 4" />

        {/* 16 Radial Symmetry Petals */}
        {Array.from({ length: 16 }).map((_, i) => {
          const angle = (i * 360) / 16;
          return (
            <g key={i} transform={`rotate(${angle} 200 200)`}>
              {/* Outer Petal */}
              <path
                d="M 200 40 Q 215 90 200 140 Q 185 90 200 40"
                fill="none"
                stroke="url(#rangoliGold)"
                strokeWidth="1.2"
              />
              {/* Inner Diamond Petal */}
              <polygon
                points="200,100 210,120 200,140 190,120"
                fill="none"
                stroke="url(#rangoliGlow)"
                strokeWidth="1"
              />
              {/* Diya Dot Accent */}
              <circle cx="200" cy="35" r="3" fill="#fbbf24" />
            </g>
          );
        })}

        {/* 8 Secondary Lotus Petals */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i * 360) / 8 + 22.5;
          return (
            <g key={`secondary-${i}`} transform={`rotate(${angle} 200 200)`}>
              <path
                d="M 200 80 C 230 110 230 150 200 170 C 170 150 170 110 200 80"
                fill="none"
                stroke="url(#rangoliGold)"
                strokeWidth="1.4"
                strokeOpacity="0.75"
              />
              <circle cx="200" cy="72" r="2.5" fill="#f59e0b" />
            </g>
          );
        })}
      </motion.svg>
    </div>
  );
};
