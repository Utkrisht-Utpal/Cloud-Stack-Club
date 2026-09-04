import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Heart, Copy, Check, GraduationCap, Award, BookOpen, X } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TeachersDayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeachersDayModal: React.FC<TeachersDayModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background page scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      const count = parseInt(document.body.dataset.modalCount || '0', 10) + 1;
      document.body.dataset.modalCount = count.toString();
      if (count === 1) {
        document.body.style.setProperty('overflow', 'hidden', 'important');
        document.documentElement.style.setProperty('overflow', 'hidden', 'important');
      }

      return () => {
        const newCount = Math.max(0, parseInt(document.body.dataset.modalCount || '1', 10) - 1);
        document.body.dataset.modalCount = newCount.toString();
        if (newCount === 0) {
          document.body.style.overflow = '';
          document.documentElement.style.overflow = '';
        }
      };
    }
  }, [isOpen]);

  const triggerCelebration = () => {
    // Elegant festive burst of golden & floral confetti in front of modal
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.5 },
      colors: ['#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#fbbf24', '#f43f5e'],
      zIndex: 999999,
    });
  };

  const greetingMessage = `Happy Teacher's Day to our esteemed mentors and faculty at Chandigarh University! 🎓✨\nThank you for inspiring us to Learn, Build, Deploy, and Scale at Cloud Stack Club.\nYour guidance shapes our future! 🌸`;

  const handleCopyGreeting = () => {
    navigator.clipboard.writeText(greetingMessage);
    setCopied(true);
    triggerCelebration();
    setTimeout(() => setCopied(false), 2500);
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-0"
        />

        {/* Modal Container — 100% opaque solid background in both light & dark themes */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl z-10 border border-amber-300/80 dark:border-amber-500/30 bg-white dark:bg-slate-900 text-slate-900 dark:text-white my-auto overflow-hidden"
        >
          {/* Subtle Decorative Ambient Background Glows */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-400/10 dark:bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-20 cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Banner */}
          <div className="text-center space-y-3 pb-5 border-b border-amber-200/80 dark:border-slate-800 relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100 dark:bg-amber-500/20 border border-amber-300/80 dark:border-amber-500/40 text-amber-900 dark:text-amber-300 text-xs font-black uppercase tracking-wider shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-spin" />
              <span>National Teacher's Day • 5th September</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-spin" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              A Heartfelt Tribute to Our <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 dark:from-amber-400 dark:via-orange-400 dark:to-rose-400 bg-clip-text text-transparent">Mentors &amp; Teachers</span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 max-w-lg mx-auto italic font-medium leading-relaxed">
              &ldquo;Guru is the lamp that dispels the darkness of ignorance and guides our journey of learning and innovation.&rdquo;
            </p>
          </div>

          {/* Faculty Mentor Spotlight Cards */}
          <div className="py-5 space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Cloud Stack Club Faculty Leadership</span>
              </span>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Chandigarh University
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Mentor 1: Dr. Deepti Sharma */}
              <div className="p-4 rounded-2xl bg-amber-50/40 dark:bg-slate-800/80 border border-amber-200/80 dark:border-amber-500/20 shadow-xs hover:border-amber-400/60 transition-all flex items-start gap-3 group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                    Dr. Deepti Sharma
                  </h4>
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    Faculty Advisor
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                    Guiding students with 26+ years of academic, research, and cloud excellence.
                  </p>
                </div>
              </div>

              {/* Mentor 2: Prof. Navjot Singh */}
              <div className="p-4 rounded-2xl bg-blue-50/40 dark:bg-slate-800/80 border border-blue-200/80 dark:border-blue-500/20 shadow-xs hover:border-blue-400/60 transition-all flex items-start gap-3 group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                    Prof. Navjot Singh
                  </h4>
                  <p className="text-xs font-bold text-blue-700 dark:text-sky-400">
                    Co-Faculty Advisor
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                    Mentoring club coordinators and driving technical innovation across domains.
                  </p>
                </div>
              </div>
            </div>

            {/* Gratitude Message Card */}
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/40 text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 leading-relaxed space-y-1.5">
              <p className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-rose-500 shrink-0 fill-rose-500" />
                <span>With profound respect and gratitude from all students &amp; council members:</span>
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                To all our professors, instructors, lab coordinators, and mentors at Chandigarh University—thank you for your patience, dedication, and for inspiring us to reach greater heights every single day!
              </p>
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 relative z-10">
            <button
              type="button"
              onClick={triggerCelebration}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Shower Flowers &amp; Confetti 🌸</span>
            </button>

            <button
              type="button"
              onClick={handleCopyGreeting}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">Wishes Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>Copy Teacher's Day Message</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
