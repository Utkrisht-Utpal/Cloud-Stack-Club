import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, GraduationCap, X, BookOpen } from 'lucide-react';
import confetti from 'canvas-confetti';
import { TeachersDayModal } from './TeachersDayModal';

interface TeachersDayCelebrationProps {
  isScrolled?: boolean;
  isDismissed?: boolean;
  onDismiss?: () => void;
}

export const TeachersDayCelebration: React.FC<TeachersDayCelebrationProps> = ({
  isScrolled = false,
  isDismissed: externalDismissed,
  onDismiss: externalOnDismiss,
}) => {
  // Session-scoped dismissal: in-memory state resets on browser refresh / page reload
  const [internalDismissed, setInternalDismissed] = useState<boolean>(false);
  const isDismissed = externalDismissed !== undefined ? externalDismissed : internalDismissed;
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Trigger an initial subtle welcome celebration on first load
  useEffect(() => {
    const hasCelebrated = sessionStorage.getItem('csc_teachers_day_celebrated');
    if (!hasCelebrated) {
      sessionStorage.setItem('csc_teachers_day_celebrated', 'true');
      const timer = setTimeout(() => {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.1, x: 0.5 },
          colors: ['#f59e0b', '#ec4899', '#3b82f6', '#10b981'],
          zIndex: 999999,
        });
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCelebrate = (e: React.MouseEvent) => {
    e.stopPropagation();
    confetti({
      particleCount: 80,
      spread: 75,
      origin: { y: 0.3 },
      colors: ['#f59e0b', '#fbbf24', '#ec4899', '#8b5cf6', '#10b981'],
      zIndex: 999999,
    });
  };

  const handleDismiss = () => {
    if (externalOnDismiss) {
      externalOnDismiss();
    } else {
      setInternalDismissed(true);
    }
  };

  const isRibbonVisible = !isDismissed && !isScrolled;

  return (
    <>
      {/* ── 1. TOP CELEBRATORY ANNOUNCEMENT RIBBON ── */}
      <AnimatePresence initial={false}>
        {isRibbonVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="w-full overflow-hidden bg-gradient-to-r from-amber-600 via-orange-500 to-rose-600 dark:from-amber-700 dark:via-orange-600 dark:to-rose-700 text-white shadow-md border-b border-amber-400/30 select-none relative z-50"
          >
            {/* Animated shimmer overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] bg-[length:200%_100%] animate-[shimmer_3s_infinite] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-3 text-xs font-semibold relative z-10">
              {/* Left & Center Message */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/25 text-amber-200 border border-white/20 text-[10px] sm:text-[11px] font-black uppercase tracking-wider shrink-0">
                  <GraduationCap className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span>Teacher's Day</span>
                </span>

                <p className="truncate text-xs text-white/95 font-bold tracking-tight">
                  <span className="hidden md:inline font-black text-amber-100">Happy National Teacher's Day! </span>
                  <span className="font-normal opacity-90 hidden sm:inline">Honoring our mentors &amp; faculty who guide us to </span>
                  <span className="font-extrabold text-amber-200 underline decoration-amber-300/40">Learn • Build • Scale</span>
                  <span className="hidden lg:inline"> at Chandigarh University 🌸</span>
                </p>
              </div>

              {/* Right Action Controls */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Celebrate Button */}
                <button
                  type="button"
                  onClick={handleCelebrate}
                  className="px-2.5 sm:px-3 py-1 rounded-xl bg-white/20 hover:bg-white/30 active:scale-95 text-white text-[11px] sm:text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-xs border border-white/25 shadow-xs"
                  title="Celebrate with floral confetti"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Celebrate 🌸</span>
                </button>

                {/* View Tribute Modal Button */}
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/30 hover:bg-black/40 text-amber-200 hover:text-white text-xs font-extrabold transition-all cursor-pointer border border-white/15"
                  title="View Teacher's Day Tribute"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Tribute</span>
                </button>

                {/* Dismiss Button */}
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="p-1 rounded-lg hover:bg-black/20 text-white/80 hover:text-white transition-colors cursor-pointer"
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
        {isDismissed && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={() => setIsModalOpen(true)}
            className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white shadow-xl shadow-amber-500/25 border border-white/25 text-xs font-black flex items-center gap-2 hover:scale-105 active:scale-95 transition-all cursor-pointer backdrop-blur-md group"
            title="Happy Teacher's Day • View Tribute"
          >
            <GraduationCap className="w-4 h-4 text-amber-200 group-hover:rotate-12 transition-transform" />
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
