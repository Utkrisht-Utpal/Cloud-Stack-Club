import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  isVisible: boolean;
  message: string;
  onClose: () => void;
  type?: 'success' | 'error' | 'info';
  duration?: number; // ms, default 3000 (3 seconds)
}

export const Toast: React.FC<ToastProps> = ({
  isVisible,
  message,
  onClose,
  type = 'success',
  duration = 3000,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-dismiss after `duration` ms whenever toast becomes visible
  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [isVisible, onClose, duration]);

  const config = {
    success: {
      border: 'border-blue-200/90 dark:border-blue-500/30',
      badgeBg: 'bg-blue-50 text-blue-600 border border-blue-200/80 dark:bg-blue-500/20 dark:text-sky-400 dark:border-blue-500/30',
      glow: 'shadow-[0_12px_32px_-6px_rgba(37,99,235,0.14),0_4px_16px_-2px_rgba(15,23,42,0.06)] dark:shadow-[0_16px_40px_-8px_rgba(0,0,0,0.8),0_0_20px_rgba(59,130,246,0.22)]',
      lineBg: 'bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400 shadow-[0_0_6px_rgba(37,99,235,0.35)] dark:shadow-[0_0_8px_rgba(56,189,248,0.7)]',
      icon: <Check className="w-3.5 h-3.5 stroke-[2.5]" />,
    },
    error: {
      border: 'border-rose-200/90 dark:border-blue-500/30',
      badgeBg: 'bg-rose-50 text-rose-600 border border-rose-200/80 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30',
      glow: 'shadow-[0_12px_32px_-6px_rgba(225,29,72,0.14),0_4px_16px_-2px_rgba(15,23,42,0.06)] dark:shadow-[0_16px_40px_-8px_rgba(0,0,0,0.8),0_0_20px_rgba(59,130,246,0.22)]',
      lineBg: 'bg-gradient-to-r from-blue-600 via-rose-500 to-sky-400 shadow-[0_0_6px_rgba(225,29,72,0.35)] dark:shadow-[0_0_8px_rgba(56,189,248,0.7)]',
      icon: <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />,
    },
    info: {
      border: 'border-sky-200/90 dark:border-blue-500/30',
      badgeBg: 'bg-sky-50 text-sky-600 border border-sky-200/80 dark:bg-sky-500/20 dark:text-sky-400 dark:border-sky-500/30',
      glow: 'shadow-[0_12px_32px_-6px_rgba(14,165,233,0.14),0_4px_16px_-2px_rgba(15,23,42,0.06)] dark:shadow-[0_16px_40px_-8px_rgba(0,0,0,0.8),0_0_20px_rgba(59,130,246,0.22)]',
      lineBg: 'bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 shadow-[0_0_6px_rgba(14,165,233,0.35)] dark:shadow-[0_0_8px_rgba(56,189,248,0.7)]',
      icon: <Info className="w-3.5 h-3.5 stroke-[2.5]" />,
    },
  }[type];

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.94 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={`fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[100010] flex flex-col rounded-xl border backdrop-blur-2xl bg-white/95 dark:bg-slate-950/95 text-slate-800 dark:text-white max-w-[90vw] sm:max-w-sm pointer-events-auto select-none overflow-hidden ${config.border} ${config.glow}`}
        >
          <div className="flex items-center gap-2.5 px-3.5 py-2.5">
            {/* Subtle Icon Indicator */}
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${config.badgeBg}`}
            >
              {config.icon}
            </div>

            {/* Toast Message */}
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 pr-1 leading-snug flex-1">
              {message}
            </p>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-white/10 transition-colors shrink-0 ml-1 cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Animated line as time reduces */}
          <div className="w-full h-[2px] bg-slate-100 dark:bg-slate-800/60 overflow-hidden">
            <motion.div
              key={`progress-${message}`}
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: duration / 1000, ease: 'linear' }}
              className={`h-full ${config.lineBg}`}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

