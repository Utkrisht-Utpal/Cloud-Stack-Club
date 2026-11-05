import React from 'react';
import { FestiveDiya } from './FestiveDiya';

export const DiwaliCelebration: React.FC = () => {
  return (
    <>
      {/* 1. Hanging Top Festive Lights & Marigold Toran */}
      <div className="fixed top-0 inset-x-0 z-50 pointer-events-none select-none overflow-hidden h-7 sm:h-8">
        {/* Continuous top string wire */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-amber-600/30 via-yellow-400/50 to-amber-600/30" />
        <div className="w-full flex justify-between items-start px-2">
          {Array.from({ length: 28 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              {/* Wire drop */}
              <div
                className={`w-px ${
                  i % 3 === 0 ? 'h-2.5' : i % 2 === 0 ? 'h-2' : 'h-1.5'
                } bg-amber-400/80`}
              />
              {/* Glowing Light Bulb / Marigold with warm ambient aura */}
              <div
                className={`w-3 h-3 rounded-full ${
                  i % 2 === 0
                    ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24,0_0_16px_rgba(245,158,11,0.85)]'
                    : 'bg-yellow-300 shadow-[0_0_12px_#fde047,0_0_18px_rgba(234,179,8,0.85)]'
                } border border-amber-200/70`}
              />
              {/* Mango Leaf Accent */}
              {i % 2 === 0 && (
                <div className="w-1.5 h-3 bg-gradient-to-b from-emerald-600 to-green-800 rounded-b-full -mt-0.5" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Left Floating Interactive Diya with warm floor glow */}
      <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-40 select-none">
        <div className="absolute -inset-4 rounded-full bg-amber-500/20 blur-xl pointer-events-none" />
        <FestiveDiya size="md" showTooltip />
      </div>

      {/* 3. Right Floating Interactive Diya (Positioned Beside Chatbot) */}
      <div className="fixed bottom-4 right-20 sm:bottom-6 sm:right-24 z-40 select-none">
        <div className="absolute -inset-4 rounded-full bg-amber-500/20 blur-xl pointer-events-none" />
        <FestiveDiya size="md" showTooltip />
      </div>
    </>
  );
};
