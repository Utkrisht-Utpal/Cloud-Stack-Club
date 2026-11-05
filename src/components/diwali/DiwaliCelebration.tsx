import React from 'react';
import { motion } from 'framer-motion';
import { triggerDiwaliFireworks } from '../../utils/diwaliFireworks';

export const DiwaliCelebration: React.FC = () => {
  const handleDiyaClick = () => {
    triggerDiwaliFireworks();
  };

  return (
    <>
      {/* 1. Hanging Top Marigold & Mango Leaf Toran (Subtle & Non-intrusive) */}
      <div className="fixed top-0 inset-x-0 z-50 pointer-events-none select-none overflow-hidden h-7">
        <div className="w-full flex justify-between items-start opacity-85">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              {/* String */}
              <div className="w-px h-1.5 bg-amber-400/70" />
              {/* Alternating Orange / Gold Marigold Flower + Green Leaf */}
              <div
                className={`w-3.5 h-3.5 rounded-full shadow-sm ${
                  i % 2 === 0
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                    : 'bg-gradient-to-br from-yellow-400 to-amber-500'
                } border border-amber-300/40`}
              />
              {/* Subtle Mango Leaf Accent */}
              {i % 3 === 0 && (
                <div className="w-1.5 h-3 bg-gradient-to-b from-emerald-600 to-green-700 rounded-b-full -mt-0.5" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Left Floating Interactive Diya */}
      <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-40 select-none">
        <motion.div
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleDiyaClick}
          className="group relative cursor-pointer flex flex-col items-center"
          title="Click to burst Diwali fireworks! 🎆"
        >
          {/* Flame Ambient Glow */}
          <div className="absolute -top-6 w-14 h-14 rounded-full bg-amber-500/35 blur-xl pointer-events-none group-hover:scale-125 transition-transform" />

          {/* Animated Flickering Flame */}
          <motion.div
            animate={{
              scaleY: [1, 1.18, 0.95, 1.12, 1],
              scaleX: [1, 0.92, 1.08, 0.96, 1],
              rotate: [0, -2, 3, -1, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.4,
              ease: 'easeInOut',
            }}
            className="relative z-10 w-4 h-7 -mb-1 flex items-center justify-center"
          >
            {/* Outer Flame (Orange) */}
            <div className="w-full h-full rounded-full bg-gradient-to-t from-orange-600 via-amber-400 to-yellow-200 blur-[0.5px] shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
            {/* Inner Flame Core (White-hot) */}
            <div className="absolute bottom-1 w-1.5 h-3 rounded-full bg-white blur-[0.2px]" />
          </motion.div>

          {/* Terracotta / Brass Diya Body */}
          <svg width="48" height="24" viewBox="0 0 48 24" className="drop-shadow-md">
            <defs>
              <linearGradient id="diyaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ea580c" />
                <stop offset="50%" stopColor="#c2410c" />
                <stop offset="100%" stopColor="#7c2d12" />
              </linearGradient>
              <linearGradient id="goldRim" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
            {/* Base Lamp Bowl */}
            <path
              d="M 4 8 C 8 20 40 20 44 8 C 36 12 12 12 4 8 Z"
              fill="url(#diyaGrad)"
              stroke="#7c2d12"
              strokeWidth="0.8"
            />
            {/* Golden Rim */}
            <ellipse cx="24" cy="8" rx="20" ry="3.5" fill="url(#goldRim)" />
            {/* Central Wick Base */}
            <ellipse cx="24" cy="8" rx="4" ry="1.5" fill="#451a03" />
          </svg>

          {/* Floor Warm Light Reflection */}
          <div className="w-12 h-2.5 rounded-full bg-amber-500/30 blur-sm -mt-1" />

          {/* Hover Tooltip */}
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md shadow-lg pointer-events-none whitespace-nowrap">
            Light Diya 🪔
          </div>
        </motion.div>
      </div>

      {/* 3. Right Floating Interactive Diya (Positioned Beside Chatbot) */}
      <div className="fixed bottom-4 right-20 sm:bottom-6 sm:right-24 z-40 select-none">
        <motion.div
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleDiyaClick}
          className="group relative cursor-pointer flex flex-col items-center"
          title="Click to burst Diwali fireworks! 🎆"
        >
          {/* Flame Ambient Glow */}
          <div className="absolute -top-6 w-14 h-14 rounded-full bg-amber-500/35 blur-xl pointer-events-none group-hover:scale-125 transition-transform" />

          {/* Animated Flickering Flame */}
          <motion.div
            animate={{
              scaleY: [1, 1.15, 0.92, 1.14, 1],
              scaleX: [1, 0.95, 1.06, 0.94, 1],
              rotate: [0, 2, -3, 1, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: 'easeInOut',
              delay: 0.3,
            }}
            className="relative z-10 w-4 h-7 -mb-1 flex items-center justify-center"
          >
            <div className="w-full h-full rounded-full bg-gradient-to-t from-orange-600 via-amber-400 to-yellow-200 blur-[0.5px] shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
            <div className="absolute bottom-1 w-1.5 h-3 rounded-full bg-white blur-[0.2px]" />
          </motion.div>

          {/* Terracotta / Brass Diya Body */}
          <svg width="48" height="24" viewBox="0 0 48 24" className="drop-shadow-md">
            <path
              d="M 4 8 C 8 20 40 20 44 8 C 36 12 12 12 4 8 Z"
              fill="url(#diyaGrad)"
              stroke="#7c2d12"
              strokeWidth="0.8"
            />
            <ellipse cx="24" cy="8" rx="20" ry="3.5" fill="url(#goldRim)" />
            <ellipse cx="24" cy="8" rx="4" ry="1.5" fill="#451a03" />
          </svg>

          {/* Floor Warm Light Reflection */}
          <div className="w-12 h-2.5 rounded-full bg-amber-500/30 blur-sm -mt-1" />

          {/* Hover Tooltip */}
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md shadow-lg pointer-events-none whitespace-nowrap">
            Burst Crackers 🎆
          </div>
        </motion.div>
      </div>
    </>
  );
};
