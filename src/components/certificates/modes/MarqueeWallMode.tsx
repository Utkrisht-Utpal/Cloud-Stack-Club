import React, { useMemo } from 'react';
import type { Certificate } from '../../../types/database';

interface MarqueeWallModeProps {
  certificates: Certificate[];
  onSelect: (index: number) => void;
}

// Fisher-Yates shuffle with seed variation for stable, organic randomness per row
const shuffleArray = <T,>(array: T[], seedOffset: number): T[] => {
  const result = [...array];
  let m = result.length;
  let t: T;
  let i: number;
  const pseudoRandom = (seed: number) => {
    const x = Math.sin(seed + seedOffset) * 10000;
    return x - Math.floor(x);
  };

  let counter = 1;
  while (m) {
    i = Math.floor(pseudoRandom(counter++) * m--);
    t = result[m];
    result[m] = result[i];
    result[i] = t;
  }
  return result;
};

// Expand array to ensure smooth continuous marquee glide without gaps
const ensureMinimumItems = (items: Certificate[], minCount = 12): Certificate[] => {
  if (items.length === 0) return [];
  let expanded = [...items];
  while (expanded.length < minCount) {
    expanded = [...expanded, ...items];
  }
  // Double for seamless 0% -> -50% loop
  return [...expanded, ...expanded];
};

export const MarqueeWallMode: React.FC<MarqueeWallModeProps> = ({
  certificates,
  onSelect,
}) => {
  // Generate 3 uniquely randomized row sets
  const row1Items = useMemo(() => {
    const shuffled = shuffleArray(certificates, 101);
    return ensureMinimumItems(shuffled, 10);
  }, [certificates]);

  const row2Items = useMemo(() => {
    const shuffled = shuffleArray(certificates, 307);
    return ensureMinimumItems(shuffled, 10);
  }, [certificates]);

  const row3Items = useMemo(() => {
    const shuffled = shuffleArray(certificates, 521);
    return ensureMinimumItems(shuffled, 10);
  }, [certificates]);

  const findOriginalIndex = (certId: string): number => {
    const idx = certificates.findIndex((c) => c.id === certId);
    return idx >= 0 ? idx : 0;
  };

  const dur1 = Math.max(row1Items.length * 3.2, 32);
  const dur2 = Math.max(row2Items.length * 3.8, 38);
  const dur3 = Math.max(row3Items.length * 2.8, 28);

  return (
    <div className="relative w-full py-4 overflow-hidden select-none space-y-4">
      {/* Dynamic Keyframe Styles with Guaranteed In-Place Pause & Resume */}
      <style>{`
        @keyframes marqueeGlideLeft {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        @keyframes marqueeGlideRight {
          0% { transform: translate3d(-50%, 0, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
        .marquee-row-hover:hover .marquee-track-anim {
          animation-play-state: paused !important;
        }
      `}</style>

      {/* Edge Vignette Blur Gradients */}
      <div className="absolute left-0 inset-y-0 w-16 sm:w-32 bg-gradient-to-r from-slate-50 dark:from-slate-950 to-transparent z-20 pointer-events-none" />
      <div className="absolute right-0 inset-y-0 w-16 sm:w-32 bg-gradient-to-l from-slate-50 dark:from-slate-950 to-transparent z-20 pointer-events-none" />

      {/* Row 1: Leftward Gliding Stream */}
      <div className="marquee-row-hover flex overflow-hidden py-1.5 cursor-pointer">
        <div
          className="marquee-track-anim flex gap-4 sm:gap-6 shrink-0 will-change-transform"
          style={{
            animation: `marqueeGlideLeft ${dur1}s linear infinite`,
          }}
        >
          {row1Items.map((cert, index) => {
            const originalIdx = findOriginalIndex(cert.id);
            return (
              <div
                key={`row1-${cert.id}-${index}`}
                onClick={() => onSelect(originalIdx)}
                className="w-64 sm:w-80 aspect-[4/3] rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-2xl hover:border-blue-500/60 hover:scale-105 hover:-translate-y-1 transition-all duration-200 p-2.5 shrink-0 flex items-center justify-center overflow-hidden group"
              >
                <div className="w-full h-full rounded-xl bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-2 overflow-hidden">
                  <img
                    src={cert.image_url}
                    alt="Certificate"
                    loading="lazy"
                    className="w-full h-full object-contain rounded-lg group-hover:scale-103 transition-transform duration-300"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 2: Rightward Gliding Stream (Reverse Direction) */}
      <div className="marquee-row-hover flex overflow-hidden py-1.5 cursor-pointer">
        <div
          className="marquee-track-anim flex gap-4 sm:gap-6 shrink-0 will-change-transform"
          style={{
            animation: `marqueeGlideRight ${dur2}s linear infinite`,
          }}
        >
          {row2Items.map((cert, index) => {
            const originalIdx = findOriginalIndex(cert.id);
            return (
              <div
                key={`row2-${cert.id}-${index}`}
                onClick={() => onSelect(originalIdx)}
                className="w-64 sm:w-80 aspect-[4/3] rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-2xl hover:border-sky-500/60 hover:scale-105 hover:-translate-y-1 transition-all duration-200 p-2.5 shrink-0 flex items-center justify-center overflow-hidden group"
              >
                <div className="w-full h-full rounded-xl bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-2 overflow-hidden">
                  <img
                    src={cert.image_url}
                    alt="Certificate"
                    loading="lazy"
                    className="w-full h-full object-contain rounded-lg group-hover:scale-103 transition-transform duration-300"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 3: Leftward Gliding Stream (Staggered Speed) */}
      <div className="marquee-row-hover flex overflow-hidden py-1.5 cursor-pointer">
        <div
          className="marquee-track-anim flex gap-4 sm:gap-6 shrink-0 will-change-transform"
          style={{
            animation: `marqueeGlideLeft ${dur3}s linear infinite`,
          }}
        >
          {row3Items.map((cert, index) => {
            const originalIdx = findOriginalIndex(cert.id);
            return (
              <div
                key={`row3-${cert.id}-${index}`}
                onClick={() => onSelect(originalIdx)}
                className="w-64 sm:w-80 aspect-[4/3] rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-2xl hover:border-indigo-500/60 hover:scale-105 hover:-translate-y-1 transition-all duration-200 p-2.5 shrink-0 flex items-center justify-center overflow-hidden group"
              >
                <div className="w-full h-full rounded-xl bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-2 overflow-hidden">
                  <img
                    src={cert.image_url}
                    alt="Certificate"
                    loading="lazy"
                    className="w-full h-full object-contain rounded-lg group-hover:scale-103 transition-transform duration-300"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
