import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Download, Loader2, Award } from 'lucide-react';
import type { Certificate } from '../../types/database';

interface CertificateLightboxProps {
  isOpen: boolean;
  certificates: Certificate[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export const CertificateLightbox: React.FC<CertificateLightboxProps> = ({
  isOpen,
  certificates,
  currentIndex,
  onClose,
  onNavigate,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const currentCert = certificates[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < certificates.length - 1;

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

  // Download certificate with clean filename
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentCert?.image_url || isDownloading) return;

    setIsDownloading(true);
    const filename = `Cloud-Stack-Club-Certificate-${currentIndex + 1}.jpg`;

    const triggerBlobDownload = (blob: Blob) => {
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
    };

    const fetchImageBlob = async (url: string): Promise<Blob | null> => {
      try {
        const response = await fetch(url);
        if (response.ok) return await response.blob();
      } catch {}
      return null;
    };

    try {
      // 1. Direct fetch
      let blob = await fetchImageBlob(currentCert.image_url);

      // 2. CORS proxy fallback
      if (!blob) {
        const cleanUrl = currentCert.image_url.trim();
        const proxiedUrl = `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&output=jpg`;
        blob = await fetchImageBlob(proxiedUrl);
      }

      if (blob) {
        triggerBlobDownload(blob);
      } else {
        // 3. Canvas conversion fallback
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = currentCert.image_url;

        await new Promise<void>((resolve, reject) => {
          if (img.complete) resolve();
          else {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Image load failed'));
          }
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((canvasBlob) => {
            if (canvasBlob) triggerBlobDownload(canvasBlob);
          }, 'image/jpeg', 0.95);
        }
      }
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  if (!isOpen || !currentCert) return null;

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
            <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-sky-400 text-xs font-bold flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              <span>Member Certificate</span>
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">
              {currentIndex + 1} / {certificates.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="p-2.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-slate-200 hover:text-white hover:bg-slate-800 transition-all cursor-pointer shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50"
              title="Download Certificate"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={handleCloseClick}
              className="p-2.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-slate-200 hover:text-white hover:bg-red-500/20 hover:border-red-500/40 transition-all cursor-pointer shadow-xl hover:scale-105 active:scale-95"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Certificate Display */}
        <div
          onClick={handleCloseClick}
          className="relative z-10 w-full h-full flex items-center justify-center p-4 sm:p-12 md:p-16"
        >
          <motion.div
            key={currentCert.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl max-h-[82vh] flex items-center justify-center"
          >
            <img
              src={currentCert.image_url}
              alt={`Certificate #${currentIndex + 1}`}
              className="max-h-[80vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl border border-white/10"
            />
          </motion.div>
        </div>

        {/* Navigation Arrows (Desktop & Tablet) */}
        {hasPrev && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-slate-900/80 border border-slate-700/70 text-white hover:bg-blue-600 hover:border-blue-500 transition-all cursor-pointer shadow-2xl hover:scale-110 active:scale-95 hidden sm:flex items-center justify-center"
            title="Previous Certificate (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {hasNext && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-slate-900/80 border border-slate-700/70 text-white hover:bg-blue-600 hover:border-blue-500 transition-all cursor-pointer shadow-2xl hover:scale-110 active:scale-95 hidden sm:flex items-center justify-center"
            title="Next Certificate (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>
    </AnimatePresence>
  );

  return createPortal(content, document.body);
};
