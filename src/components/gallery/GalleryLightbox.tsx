import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import type { GalleryPhoto } from '../../types/database';

interface GalleryLightboxProps {
  isOpen: boolean;
  photos: GalleryPhoto[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export const GalleryLightbox: React.FC<GalleryLightboxProps> = ({
  isOpen,
  photos,
  currentIndex,
  onClose,
  onNavigate,
}) => {
  const currentPhoto = photos[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  const handlePrev = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (hasPrev) {
        onNavigate(currentIndex - 1);
      }
    },
    [hasPrev, currentIndex, onNavigate]
  );

  const handleNext = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (hasNext) {
        onNavigate(currentIndex + 1);
      }
    },
    [hasNext, currentIndex, onNavigate]
  );

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrev, handleNext, onClose]);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentPhoto?.image_url) return;
    try {
      const response = await fetch(currentPhoto.image_url, { mode: 'cors' });
      if (!response.ok) throw new Error('Fetch failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = `csc-gallery-${currentPhoto.event?.slug || 'photo'}-${currentIndex + 1}.jpg`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.warn('Direct blob download failed, opening image in new tab:', err);
      window.open(currentPhoto.image_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  if (!isOpen || !currentPhoto) return null;

  const content = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-center justify-center select-none overflow-hidden">
        {/* Full Dark Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleCloseClick}
          className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-0"
        />

        {/* Top Control Bar */}
        <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-slate-950/90 via-slate-950/50 to-transparent pointer-events-auto">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            {currentPhoto.event?.title && (
              <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-sky-400 text-xs font-bold truncate max-w-[200px] sm:max-w-md">
                {currentPhoto.event.title}
              </span>
            )}
            <span className="text-xs font-mono font-bold text-slate-400">
              {currentIndex + 1} / {photos.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="p-2.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-slate-200 hover:text-white hover:bg-slate-800 transition-all cursor-pointer shadow-xl hover:scale-105 active:scale-95"
              title="Download Photo"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleCloseClick}
              className="p-2.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-slate-200 hover:text-white hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400 transition-all cursor-pointer shadow-xl hover:scale-105 active:scale-95"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Previous Button */}
        {hasPrev && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-3 sm:left-6 z-30 p-3 sm:p-4 rounded-full bg-slate-900/90 border border-slate-700/80 text-slate-200 hover:text-white hover:bg-blue-600 hover:border-blue-500 transition-all cursor-pointer shadow-2xl hover:scale-110 active:scale-95"
            title="Previous (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Button */}
        {hasNext && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-3 sm:right-6 z-30 p-3 sm:p-4 rounded-full bg-slate-900/90 border border-slate-700/80 text-slate-200 hover:text-white hover:bg-blue-600 hover:border-blue-500 transition-all cursor-pointer shadow-2xl hover:scale-110 active:scale-95"
            title="Next (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Main Image View */}
        <div
          className="relative z-10 max-w-[92vw] max-h-[82vh] flex items-center justify-center p-2"
          onClick={(e) => e.stopPropagation()}
        >
          <motion.img
            key={currentPhoto.id}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            src={currentPhoto.image_url}
            alt={currentPhoto.caption || currentPhoto.event?.title || 'Event Gallery Photo'}
            className="max-w-full max-h-[78vh] object-contain rounded-2xl shadow-2xl border border-slate-800/80 ring-1 ring-white/10 select-none"
          />
        </div>

        {/* Bottom Caption Bar: Only show if caption exists, no date */}
        {currentPhoto.caption && currentPhoto.caption.trim() && (
          <div className="absolute bottom-0 inset-x-0 z-30 p-4 sm:p-6 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent flex flex-col items-center text-center max-w-2xl mx-auto pointer-events-none">
            <p className="text-sm sm:text-base font-semibold text-white tracking-wide drop-shadow-md">
              {currentPhoto.caption}
            </p>
          </div>
        )}
      </div>
    </AnimatePresence>
  );

  return createPortal(content, document.body);
};
