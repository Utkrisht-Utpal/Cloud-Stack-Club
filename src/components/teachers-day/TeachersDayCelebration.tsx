import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, GraduationCap, X, BookOpen } from 'lucide-react';
import confetti from 'canvas-confetti';
import { TeachersDayModal } from './TeachersDayModal';

const DISMISSED_KEY = 'csc_teachers_day_banner_dismissed';

export const TeachersDayCelebration: React.FC = () => {
  const [isBannerVisible, setIsBannerVisible] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(DISMISSED_KEY) !== 'true';
    } catch {
      return true;
    }
  });
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Trigger an initial subtle welcome celebration on first load
  useEffect(() => {
    const hasCelebrated = sessionStorage.getItem('csc_teachers_day_celebrated');
    if (!hasCelebrated) {
      sessionStorage.setItem('csc_teachers_day_celebrated', 'true');
      const timer = setTimeout(() => {
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.12, x: 0.5 },
          zIndex: 999999,
          colors: ['#f59e0b', '#fbbf24', '#ec4899', '#38bdf8', '#10b981'],
        });
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCelebrate = (e: React.MouseEvent) => {
    e.stopPropagation();
    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.25 },
      zIndex: 999999,
      colors: ['#f59e0b', '#fbbf24', '#ec4899', '#f43f5e', '#38bdf8', '#10b981'],
    });
  };

  const handleDismiss = () => {
    setIsBannerVisible(false);
    try {
      sessionStorage.setItem(DISMISSED_KEY, 'true');
    } catch {}
  };

  return (
    <>
      {/* ── 1. TOP CELEBRATORY ANNOUNCEMENT RIBBON ── */}
      <AnimatePresence>
        {isBannerVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-50 bg-slate-950/95 dark:bg-slate-950/95 text-slate-200 border-b border-amber-500/25 shadow-md select-none backdrop-blur-md overflow-hidden"
          >
            {/* Elegant golden shimmer bottom line */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent pointer-events-none" />

            <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-3 text-xs font-medium">
              {/* Left & Center Message */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-bold uppercase tracking-wider shrink-0">
                  <GraduationCap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>Teacher's Day</span>
                </span>

                <p className="truncate text-xs text-slate-300 font-normal">
                  <span className="font-bold text-white">Happy National Teacher's Day! </span>
                  <span className="opacity-90 hidden sm:inline text-slate-300">Honoring our mentors &amp; faculty at </span>
                  <span className="font-semibold text-amber-300">Chandigarh University</span>
                  <span className="hidden lg:inline text-slate-400"> who guide us to Learn • Build • Scale 🌸</span>
                </p>
              </div>

              {/* Right Action Controls */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Celebrate Button */}
                <button
                  type="button"
                  onClick={handleCelebrate}
                  className="px-2.5 sm:px-3 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-amber-300 hover:text-amber-200 text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-amber-500/30 shadow-xs"
                  title="Celebrate with floral confetti"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Celebrate 🌸</span>
                </button>

                {/* View Tribute Modal Button */}
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-slate-300 hover:text-white text-xs font-medium transition-all cursor-pointer border border-white/10"
                  title="View Teacher's Day Tribute"
                >
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tribute</span>
                </button>

                {/* Dismiss Button */}
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
                  title="Dismiss banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 2. FLOATING CELEBRATION BADGE (When Banner is Dismissed) ── */}
      <AnimatePresence>
        {!isBannerVisible && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={() => setIsModalOpen(true)}
            className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 px-3.5 py-2 rounded-2xl bg-slate-900/95 hover:bg-slate-800 text-amber-300 shadow-xl shadow-black/50 border border-amber-500/35 text-xs font-semibold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all cursor-pointer backdrop-blur-md group"
            title="Happy Teacher's Day • View Tribute"
          >
            <GraduationCap className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
            <span className="hidden sm:inline">Happy Teacher's Day 🌸</span>
            <span className="sm:hidden">Teacher's Day 🌸</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── 3. TRIBUTE MODAL ── */}
      <TeachersDayModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
