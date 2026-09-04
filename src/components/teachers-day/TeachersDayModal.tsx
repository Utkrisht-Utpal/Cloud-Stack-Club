import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Heart, Copy, Check, GraduationCap, Award, BookOpen, X } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TeachersDayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeachersDayModal: React.FC<TeachersDayModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  const triggerCelebration = () => {
    // Multi-angle festive shower in front of the modal
    // Main upward center burst
    confetti({
      particleCount: 70,
      spread: 90,
      origin: { x: 0.5, y: 0.6 },
      zIndex: 999999,
      colors: ['#f59e0b', '#fbbf24', '#f43f5e', '#ec4899', '#38bdf8', '#10b981'],
      startVelocity: 35,
    });

    // Left cannon burst
    confetti({
      particleCount: 40,
      angle: 60,
      spread: 60,
      origin: { x: 0.15, y: 0.65 },
      zIndex: 999999,
      colors: ['#f59e0b', '#ec4899', '#f43f5e', '#fbbf24'],
    });

    // Right cannon burst
    confetti({
      particleCount: 40,
      angle: 120,
      spread: 60,
      origin: { x: 0.85, y: 0.65 },
      zIndex: 999999,
      colors: ['#f59e0b', '#ec4899', '#f43f5e', '#fbbf24'],
    });
  };

  const greetingMessage = `Happy Teacher's Day to our esteemed mentors and faculty at Chandigarh University! 🎓✨\nThank you for inspiring us to Learn, Build, Deploy, and Scale at Cloud Stack Club.\nYour guidance shapes our future! 🌸`;

  const handleCopyGreeting = () => {
    navigator.clipboard.writeText(greetingMessage);
    setCopied(true);
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.65 },
      zIndex: 999999,
      colors: ['#f59e0b', '#fbbf24', '#ec4899', '#10b981'],
    });
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-0"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl z-10 border border-amber-500/30 bg-slate-950/95 dark:bg-slate-950/95 text-white my-auto overflow-hidden backdrop-blur-xl"
        >
          {/* Subtle Decorative Ambient Background Glows */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors z-20 cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Banner */}
          <div className="text-center space-y-3 pb-5 border-b border-slate-800 relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span>National Teacher's Day • 5th September</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              A Heartfelt Tribute to Our <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">Mentors &amp; Faculty</span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto italic font-medium leading-relaxed">
              &ldquo;Guru is the lamp that dispels the darkness of ignorance and guides our journey of learning and innovation.&rdquo;
            </p>
          </div>

          {/* Faculty Mentor Spotlight Cards */}
          <div className="py-5 space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Award className="w-4 h-4" />
                <span>Cloud Stack Club Faculty Leadership</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                Chandigarh University
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Mentor 1: Dr. Deepti Sharma */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 shadow-xs transition-all flex items-start gap-3 group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-6 h-6 text-amber-100" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-white truncate">
                    Dr. Deepti Sharma
                  </h4>
                  <p className="text-xs font-semibold text-amber-400">
                    Faculty Advisor
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Guiding students with 26+ years of academic, research, and cloud excellence.
                  </p>
                </div>
              </div>

              {/* Mentor 2: Prof. Navjot Singh */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 shadow-xs transition-all flex items-start gap-3 group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                  <BookOpen className="w-6 h-6 text-blue-100" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-white truncate">
                    Prof. Navjot Singh
                  </h4>
                  <p className="text-xs font-semibold text-sky-400">
                    Co-Faculty Advisor
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Mentoring club coordinators and driving technical innovation across domains.
                  </p>
                </div>
              </div>
            </div>

            {/* Gratitude Message Card */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs sm:text-[13px] text-slate-300 leading-relaxed space-y-1.5">
              <p className="font-semibold text-amber-300 flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-rose-400 shrink-0 fill-rose-400" />
                <span>With profound respect and gratitude from all students &amp; council members:</span>
              </p>
              <p className="text-slate-300">
                To all our professors, instructors, lab coordinators, and mentors at Chandigarh University—thank you for your patience, dedication, and for inspiring us to reach greater heights every single day!
              </p>
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800 relative z-10">
            <button
              type="button"
              onClick={triggerCelebration}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 text-slate-950 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all cursor-pointer border border-amber-200"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Shower Flowers &amp; Confetti 🌸</span>
            </button>

            <button
              type="button"
              onClick={handleCopyGreeting}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 active:scale-95 text-slate-200 border border-slate-700/80 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Wishes Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>Copy Teacher's Day Message</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
