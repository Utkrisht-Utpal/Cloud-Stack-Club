import React from 'react';
import { motion } from 'framer-motion';

export const DiwaliRangoli: React.FC = () => {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none -z-10 select-none overflow-visible">
      {/* 1. Subtle Warm Golden Ambient Halo */}
      <div className="absolute w-[420px] sm:w-[520px] md:w-[600px] lg:w-[640px] h-[420px] sm:h-[520px] md:h-[600px] lg:h-[640px] rounded-full bg-gradient-to-tr from-amber-500/10 via-yellow-400/8 to-orange-500/10 dark:from-amber-500/15 dark:via-yellow-400/10 dark:to-orange-500/12 blur-3xl animate-pulse" />

      {/* 2. Rotating Sacred Rangoli Mandala (Dead-center of the Hero Section) */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: 'center center' }}
        className="w-[380px] sm:w-[480px] md:w-[540px] lg:w-[580px] h-[380px] sm:h-[480px] md:h-[540px] lg:h-[580px] flex items-center justify-center"
      >
        <svg
          viewBox="0 0 500 500"
          className="w-full h-full opacity-40 dark:opacity-55 overflow-visible drop-shadow-[0_0_12px_rgba(245,158,11,0.25)]"
        >
          <defs>
            {/* Golden Gradient for Outer Mandala & Petals */}
            <linearGradient id="rangoliGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="35%" stopColor="#fbbf24" />
              <stop offset="70%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>

            {/* Saffron / Orange Flame Gradient */}
            <linearGradient id="rangoliFlame" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#ea580c" />
              <stop offset="40%" stopColor="#f59e0b" />
              <stop offset="85%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#fffbeb" />
            </linearGradient>

            {/* Crimson / Vermilion Festival Accent */}
            <linearGradient id="rangoliCrimson" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="60%" stopColor="#e11d48" />
              <stop offset="100%" stopColor="#be123c" />
            </linearGradient>

            {/* Translucent Saffron Petal Powder Fill */}
            <linearGradient id="petalFillSaffron" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#ea580c" stopOpacity="0.02" />
            </linearGradient>

            {/* Translucent Rose Petal Powder Fill */}
            <linearGradient id="petalFillRose" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.02" />
            </linearGradient>

            {/* Diya Bowl Gradient */}
            <linearGradient id="diyaBowlGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#9a3412" />
              <stop offset="50%" stopColor="#c2410c" />
              <stop offset="100%" stopColor="#7c2d12" />
            </linearGradient>
          </defs>

          {/* ── CONCENTRIC SACRED GEOMETRY CIRCLES ─────────────────────────── */}
          <circle cx="250" cy="250" r="236" fill="none" stroke="url(#rangoliGold)" strokeWidth="1.2" strokeDasharray="4 6" opacity="0.6" />
          <circle cx="250" cy="250" r="226" fill="none" stroke="url(#rangoliGold)" strokeWidth="1.5" opacity="0.8" />
          
          <circle cx="250" cy="250" r="190" fill="none" stroke="url(#rangoliGold)" strokeWidth="1" strokeDasharray="3 4" opacity="0.5" />
          <circle cx="250" cy="250" r="152" fill="none" stroke="url(#rangoliGold)" strokeWidth="1.6" opacity="0.85" />
          <circle cx="250" cy="250" r="132" fill="none" stroke="url(#rangoliCrimson)" strokeWidth="1" strokeDasharray="2 3" opacity="0.65" />
          <circle cx="250" cy="250" r="102" fill="none" stroke="url(#rangoliGold)" strokeWidth="1.8" opacity="0.9" />
          <circle cx="250" cy="250" r="70" fill="none" stroke="url(#rangoliGold)" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.75" />
          <circle cx="250" cy="250" r="40" fill="none" stroke="url(#rangoliCrimson)" strokeWidth="1.5" opacity="0.85" />

          {/* ── 16 OUTER BLOOMING LOTUS PETALS WITH DIYA FINIALS ───────────── */}
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i * 360) / 16;
            return (
              <g key={`outer-petal-${i}`} transform={`rotate(${angle} 250 250)`}>
                <path
                  d="M 250 56 Q 274 120 250 188 Q 226 120 250 56"
                  fill="url(#petalFillSaffron)"
                  stroke="url(#rangoliGold)"
                  strokeWidth="1.6"
                />
                <line x1="250" y1="58" x2="250" y2="186" stroke="url(#rangoliGold)" strokeWidth="0.8" opacity="0.7" />
                <polygon
                  points="250,110 260,135 250,160 240,135"
                  fill="none"
                  stroke="url(#rangoliCrimson)"
                  strokeWidth="1"
                  opacity="0.85"
                />

                {/* Miniature Perimeter Diya on Petal Tip (Facing Outward) */}
                <g transform="translate(250, 44)">
                  <path
                    d="M 0 -18 C -4 -10, -5 -3, 0 0 C 5 -3, 4 -10, 0 -18 Z"
                    fill="url(#rangoliFlame)"
                  />
                  <circle cx="0" cy="-6" r="1.5" fill="#ffffff" />
                  <path
                    d="M -7 0 Q 0 8 7 0 Q 0 2 -7 0 Z"
                    fill="url(#diyaBowlGrad)"
                    stroke="#fbbf24"
                    strokeWidth="0.6"
                  />
                </g>

                <circle cx="250" cy="80" r="2.5" fill="#fbbf24" />
                <circle cx="250" cy="172" r="2" fill="#ea580c" />
              </g>
            );
          })}

          {/* ── 16 INTERLACED SECONDARY LOTUS PETALS ───────────────────────── */}
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i * 360) / 16 + 11.25;
            return (
              <g key={`secondary-petal-${i}`} transform={`rotate(${angle} 250 250)`}>
                <path
                  d="M 250 96 C 275 140 270 185 250 215 C 230 185 225 140 250 96"
                  fill="url(#petalFillRose)"
                  stroke="url(#rangoliCrimson)"
                  strokeWidth="1.2"
                  strokeOpacity="0.8"
                />
                <circle cx="250" cy="90" r="3.2" fill="#f59e0b" stroke="#fef08a" strokeWidth="0.8" />
                <circle cx="242" cy="100" r="1.8" fill="#fbbf24" />
                <circle cx="258" cy="100" r="1.8" fill="#fbbf24" />
              </g>
            );
          })}

          {/* ── SACRED 8-POINTED ASHTA-LAKSHMI GEOMETRIC STAR ─────────────── */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i * 360) / 8;
            return (
              <g key={`star-ray-${i}`} transform={`rotate(${angle} 250 250)`}>
                <polygon
                  points="250,148 262,185 250,205 238,185"
                  fill="none"
                  stroke="url(#rangoliGold)"
                  strokeWidth="1.4"
                />
                <circle cx="250" cy="144" r="2.8" fill="#fbbf24" />
              </g>
            );
          })}

          {/* ── INNER CHAKRA LOTUS & SACRED SEED (CENTER) ────────────────── */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i * 360) / 8 + 22.5;
            return (
              <g key={`inner-lotus-${i}`} transform={`rotate(${angle} 250 250)`}>
                <path
                  d="M 250 190 Q 262 215 250 235 Q 238 215 250 190"
                  fill="url(#petalFillSaffron)"
                  stroke="url(#rangoliGold)"
                  strokeWidth="1.2"
                />
                <circle cx="250" cy="195" r="2" fill="#ea580c" />
              </g>
            );
          })}

          {/* ── 32 PERIMETER PEARL BORDER ─────────────────────────────────── */}
          {Array.from({ length: 32 }).map((_, i) => {
            const angle = (i * 360) / 32;
            return (
              <g key={`kolam-bead-${i}`} transform={`rotate(${angle} 250 250)`}>
                <circle cx="250" cy="226" r="2.2" fill="#f59e0b" opacity="0.85" />
              </g>
            );
          })}

          {/* Central Golden Sun Core */}
          <circle cx="250" cy="250" r="26" fill="none" stroke="url(#rangoliGold)" strokeWidth="1.5" />
          <circle cx="250" cy="250" r="14" fill="#fbbf24" fillOpacity="0.25" stroke="#f59e0b" strokeWidth="1" />
          <circle cx="250" cy="250" r="4" fill="#ea580c" />
        </svg>
      </motion.div>
    </div>
  );
};
