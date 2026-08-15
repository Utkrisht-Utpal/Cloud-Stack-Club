import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Info, AlertCircle } from 'lucide-react';

export interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonText?: string;
  variant?: 'warning' | 'error' | 'info';
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  buttonText = 'Got It',
  variant = 'warning',
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'error':
        return {
          iconBg: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
          btn: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg shadow-blue-500/25',
          icon: <AlertCircle className="w-6 h-6" />,
        };
      case 'info':
        return {
          iconBg: 'bg-blue-500/15 text-blue-600 dark:text-sky-400 border-blue-500/30',
          btn: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg shadow-blue-500/25',
          icon: <Info className="w-6 h-6" />,
        };
      case 'warning':
      default:
        return {
          iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
          btn: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg shadow-blue-500/25',
          icon: <AlertTriangle className="w-6 h-6" />,
        };
    }
  };

  const style = getVariantStyles();

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop with higher z-index overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-0"
          />

          {/* Alert Card Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700/90 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-7 space-y-5 my-auto z-10"
          >
            {/* Top-Right Dismiss Cross */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              aria-label="Close Alert"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Icon + Title */}
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${style.iconBg}`}>
                {style.icon}
              </div>
              <div className="space-y-1 pr-6">
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {message}
                </p>
              </div>
            </div>

            {/* Action Button (Signature Website Blue Accent) */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className={`w-full py-3 px-4 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center active:scale-[0.99] ${style.btn}`}
              >
                {buttonText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
