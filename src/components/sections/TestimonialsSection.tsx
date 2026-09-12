import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MessageSquare } from 'lucide-react';
import { SectionTitle } from '../ui/SectionTitle';
import { getTestimonials } from '../../services/testimonials';
import type { Testimonial } from '../../types/database';

export const TestimonialsSection: React.FC = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  // Load testimonials
  const loadTestimonials = useCallback(async () => {
    try {
      const data = await getTestimonials();
      const sorted = [...data].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
      setTestimonials(sorted);
    } catch (err) {
      console.warn('Could not load testimonials for main page:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTestimonials();

    const handleUpdate = () => {
      loadTestimonials();
    };

    window.addEventListener('csc-testimonials-updated', handleUpdate);
    return () => {
      window.removeEventListener('csc-testimonials-updated', handleUpdate);
    };
  }, [loadTestimonials]);

  return (
    <section id="testimonials" className="py-20 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle
          badge="Event Testimonials"
          title="What Participants Say"
          subtitle="Real stories, feedback, and experiences from students who participated in our club hackathons, workshops, and bootcamps."
        />

        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <div className="w-8 h-8 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : testimonials.length === 0 ? (
          <div className="py-14 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-center text-slate-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-slate-400 text-sm font-medium">No testimonials posted yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <AnimatePresence>
              {testimonials.map((t, idx) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: idx * 0.08 }}
                  className="h-full"
                >
                  {/* Testimonial Card matching User wireframe */}
                  <div className="relative h-full flex flex-col justify-between rounded-2xl bg-slate-900/60 dark:bg-slate-900/60 border border-slate-800 hover:border-blue-500/50 transition-all duration-300 p-6 sm:p-7 shadow-lg shadow-black/20 hover:shadow-blue-500/5 group backdrop-blur-sm">
                    
                    {/* Top-Left: Event Name */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 dark:text-sky-300 text-xs font-semibold tracking-wide">
                        <Calendar className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                        <span className="truncate max-w-[240px]" title={t.event_name}>
                          {t.event_name}
                        </span>
                      </div>
                    </div>

                    {/* Center: testimonial description */}
                    <div className="my-auto py-2">
                      <p className="text-slate-300 dark:text-slate-300 text-sm sm:text-base leading-relaxed font-normal whitespace-pre-line">
                        "{t.testimonial_description}"
                      </p>
                    </div>

                    {/* Bottom-Right: ~author name & department/position */}
                    <div className="pt-4 mt-3 border-t border-slate-800/60 flex flex-col items-end">
                      <span className="text-xs sm:text-sm font-medium text-slate-300 dark:text-slate-400 italic">
                        ~{t.author_name}
                      </span>
                      {t.author_position && (
                        <span className="text-[11px] sm:text-xs font-normal text-slate-400/80 dark:text-slate-500 mt-0.5 tracking-wide">
                          {t.author_position}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
};
