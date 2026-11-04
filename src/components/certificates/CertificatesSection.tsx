import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Award, Loader2, FileImage } from 'lucide-react';
import { getCertificates } from '../../services/certificates';
import { CertificateLightbox } from './CertificateLightbox';
import type { Certificate } from '../../types/database';

interface CertificatesSectionProps {
  standalone?: boolean;
}

export const CertificatesSection: React.FC<CertificatesSectionProps> = ({ standalone = false }) => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  // Lightbox state matching GalleryLightbox
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

  const openLightbox = (index: number) => {
    setActiveCertIndex(index);
    setLightboxOpen(true);
  };

  return (
    <section
      id="certificates"
      className={
        standalone
          ? 'py-6'
          : 'relative py-16 sm:py-24 bg-transparent text-slate-900 dark:text-slate-100'
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-sky-400 text-xs font-bold uppercase tracking-wider"
          >
            <Award className="w-3.5 h-3.5" />
            <span>Club Achievements</span>
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
            Celebrating the cloud credentials, industry certifications, and technical milestones earned by our club members.
          </motion.p>
        </div>

        {/* Content Showcase */}
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
              Our members are actively earning top industry certifications across AWS, Kubernetes, Azure, and Google Cloud. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {certificates.map((cert, index) => (
              <motion.div
                key={cert.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.4) }}
                onClick={() => openLightbox(index)}
                className="group relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-xl hover:border-blue-500/40 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col"
              >
                {/* Certificate Image Frame */}
                <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-hidden p-2">
                  <img
                    src={cert.image_url}
                    alt={`Cloud Stack Club Member Certificate #${index + 1}`}
                    loading="lazy"
                    className="w-full h-full object-contain rounded-lg group-hover:scale-[1.02] transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="75" viewBox="0 0 100 75"><rect width="100%" height="100%" fill="%23e2e8f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2364748b" font-size="10">Certificate</text></svg>';
                    }}
                  />

                  {/* Subtle hover overlay hint */}
                  <div className="absolute inset-0 bg-blue-600/10 dark:bg-sky-400/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Immersive Lightbox Modal (Portal on document.body, z-[999999]) */}
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
