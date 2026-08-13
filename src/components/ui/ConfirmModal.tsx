import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X, CheckCircle2 } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
          confirmBtn: 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/25',
          icon: <Trash2 className="w-6 h-6" />,
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
          confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/25',
          icon: <AlertTriangle className="w-6 h-6" />,
        };
      case 'primary':
      default:
        return {
          iconBg: 'bg-blue-500/15 text-blue-600 dark:text-sky-400 border-blue-500/30',
          confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25',
          icon: <CheckCircle2 className="w-6 h-6" />,
        };
    }
  };

  const style = getVariantStyles();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-7 space-y-5 my-auto"
        >
          {/* Top-Right Dismiss Cross */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
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

          {/* Action Buttons */}
          <div className="flex flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              disabled={isLoading}
              className={`flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 ${style.confirmBtn}`}
            >
              {isLoading ? (
                <span>Processing...</span>
              ) : (
                <span>{confirmText}</span>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
