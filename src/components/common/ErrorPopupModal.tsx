import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';

interface ErrorPopupModalProps {
  isOpen: boolean;
  message: string | null;
  onClose: () => void;
  title?: string;
  duration?: number; // In milliseconds, default 5000ms (5 seconds)
}

export const ErrorPopupModal: React.FC<ErrorPopupModalProps> = ({
  isOpen,
  message,
  onClose,
  title = 'Notice',
  duration = 5000,
}) => {
  useEffect(() => {
    if (!isOpen || !message) return;

    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [isOpen, message, duration, onClose]);

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

  useEffect(() => {
    const handleCloseAll = () => {
      if (isOpen) onClose();
    };
    window.addEventListener('close-all-modals', handleCloseAll);
    return () => window.removeEventListener('close-all-modals', handleCloseAll);
  }, [isOpen, onClose]);

  if (!isOpen || !message) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-auto">
        {/* Semi-transparent backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        />

        {/* Modal Card Centered in middle of screen matching website theme */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 10 }}
          transition={{ type: 'spring', duration: 0.35, bounce: 0.2 }}
          className="relative w-full max-w-sm sm:max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200/80 dark:border-slate-800 z-10 overflow-hidden text-center"
        >
          {/* Decreasing top progress bar that auto-dismisses popup when completed */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <motion.div
              key={message}
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: duration / 1000, ease: 'linear' }}
              className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400"
            />
          </div>

          {/* Close button top right */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Notice Icon in Website Theme Color */}
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 dark:border-blue-500/30 text-blue-600 dark:text-sky-400 flex items-center justify-center mx-auto mb-3.5 shadow-sm shadow-blue-500/10">
            <AlertCircle className="w-6 h-6 stroke-[2.2]" />
          </div>

          {/* Title */}
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mb-1.5">
            {title}
          </h3>

          {/* Error Message */}
          <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed max-w-xs sm:max-w-sm mx-auto mb-5">
            {message.split(/(contact form)/i).map((part, index) => {
              if (part.toLowerCase() === 'contact form') {
                return (
                  <a
                    key={index}
                    href="/#contact"
                    onClick={() => {
                      onClose();
                      window.dispatchEvent(new CustomEvent('close-all-modals'));
                      // Let standard anchor navigation handle it, but if on same page, scroll smooth
                      if (window.location.pathname === '/') {
                        const el = document.getElementById('contact');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="underline underline-offset-2 text-blue-600 dark:text-sky-400 hover:text-blue-700 dark:hover:text-sky-300 transition-colors font-bold"
                  >
                    {part}
                  </a>
                );
              }
              return part;
            })}
          </p>

          {/* Okay Button in Bottom Centre matching theme */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-blue-500/25 cursor-pointer"
            >
              Okay
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
