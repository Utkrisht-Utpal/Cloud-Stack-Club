import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Award, Loader2, FileImage } from 'lucide-react';
import { getCertificates } from '../../services/certificates';
import { CertificateLightbox } from './CertificateLightbox';
import { MarqueeWallMode } from './modes/MarqueeWallMode';
import type { Certificate } from '../../types/database';

interface CertificatesSectionProps {
  standalone?: boolean;
}

export const CertificatesSection: React.FC<CertificatesSectionProps> = ({
  standalone = false,
}) => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  // Lightbox State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeCertIndex, setActiveCertIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchCerts = async () => {
      try {
        const data = await getCertificates();
        if (isMounted) setCertificates(data);
      } catch (err) {
        console.error('Failed to load certificates:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchCerts();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenLightbox = (index: number) => {
    setActiveCertIndex(index);
    setLightboxOpen(true);
  };

  return (
    <section
      id="certificates"
      className={
        standalone
          ? 'py-4 space-y-6'
          : 'relative py-14 sm:py-20 bg-transparent text-slate-900 dark:text-slate-100 space-y-6'
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-sky-400 text-xs font-bold uppercase tracking-wider"
          >
            <Award className="w-3.5 h-3.5" />
            <span>Club Credentials</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white"
          >
            Member{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-400">
              Certifications
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium"
          >
            Celebrating the industry cloud credentials, professional certifications, and technical milestones earned by our club members.
          </motion.p>
        </div>

        {/* Content Display: 3-Row Marquee Wall */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-xs font-semibold">Loading certificates...</span>
          </div>
        ) : certificates.length === 0 ? (
          <div className="max-w-md mx-auto p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
              <FileImage className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Certificates Coming Soon
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Certificates uploaded by administrators in the Admin Suite will be showcased here.
            </p>
          </div>
        ) : (
          <MarqueeWallMode
            certificates={certificates}
            onSelect={handleOpenLightbox}
          />
        )}
      </div>

      {/* Fullscreen Portal Lightbox */}
      <CertificateLightbox
        isOpen={lightboxOpen}
        certificates={certificates}
        currentIndex={activeCertIndex}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(newIndex) => setActiveCertIndex(newIndex)}
      />
    </section>
  );
};
