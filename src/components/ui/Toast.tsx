import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';

interface ToastProps {
  isVisible: boolean;
  message: string;
  onClose: () => void;
  duration?: number; // ms, default 5000
}

export const Toast: React.FC<ToastProps> = ({ isVisible, message, onClose, duration = 5000 }) => {
  // Auto-dismiss after `duration` ms whenever toast becomes visible
  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [isVisible, onClose, duration]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl glass-panel shadow-2xl border-emerald-500/30 bg-slate-900/90 text-white overflow-hidden"
        >
          <div className="flex items-center gap-3 px-5 py-3.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-medium pr-2">{message}</span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              aria-label="Close Toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Progress bar that shrinks over the duration so users can see it closing */}
          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: duration / 1000, ease: 'linear' }}
            style={{ transformOrigin: 'left' }}
            className="h-0.5 bg-emerald-400/70 w-full"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
