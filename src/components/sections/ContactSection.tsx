import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MapPin, Send, CheckCircle2, Sparkles } from 'lucide-react';
import { siteConfig } from '../../constants/siteConfig';
import { Button } from '../ui/Button';
import { SectionTitle } from '../ui/SectionTitle';
import { ErrorPopupModal } from '../common/ErrorPopupModal';
import { submitFeedback } from '../../services/supabase';
import { TurnstileWidget } from '../common/TurnstileWidget';

// Clean SVG icons for LinkedIn and Instagram
const LinkedinIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
);

const InstagramIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

export const ContactSection: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;

    if (import.meta.env.VITE_TURNSTILE_SITE_KEY && !turnstileToken) {
      setError('Please complete the security check.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await submitFeedback({
        name: formData.name.trim(),
        email: formData.email.trim(),
        message: formData.message.trim(),
      });

      setIsSubmitted(true);
      setFormData({ name: '', email: '', message: '' });
      setTurnstileToken(''); // Reset token

      // Automatically reset back to normal form after 3 seconds
      setTimeout(() => {
        setIsSubmitted(false);
      }, 3000);
    } catch (err: any) {
      console.error('Feedback submission error:', err);
      setError(err?.message || 'Failed to submit feedback. Please try again.');
      setTurnstileToken(''); // Reset token on error so they have to redo if needed (though it handles itself usually)
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-24 relative overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <SectionTitle
          badge="Get In Touch"
          title="Connect With Cloud Stack Club"
          subtitle="Have questions about events, membership, or collaborations? Send us your message or feedback."
          className="mb-16"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Side Details */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-6">
            {/* Contact Info Card */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex-1 flex flex-col"
            >
              <div className="neumorphic-card p-6 sm:p-7 flex-1 flex flex-col justify-center">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-5">Contact Information</h3>

                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-100/80 dark:bg-blue-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block uppercase font-medium">Email Us</span>
                      <a
                        href={`mailto:${siteConfig.contact.email}`}
                        className="text-sm font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-sky-400 transition-colors"
                      >
                        {siteConfig.contact.email}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-100/80 dark:bg-blue-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block uppercase font-medium">Location</span>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {siteConfig.contact.location}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Social Links Card */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <div className="neumorphic-card p-6 sm:p-7 space-y-4">
                <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  Follow Our Social Channels
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <a
                    href={siteConfig.contact.socials.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl neumorphic-card flex items-center justify-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-sky-400 transition-all cursor-pointer"
                  >
                    <LinkedinIcon className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>LinkedIn</span>
                  </a>
                  <a
                    href={siteConfig.contact.socials.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl neumorphic-card flex items-center justify-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-pink-600 dark:hover:text-pink-400 transition-all cursor-pointer"
                  >
                    <InstagramIcon className="w-4 h-4 text-pink-600 shrink-0" />
                    <span>Instagram</span>
                  </a>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Side Form */}
          <div className="lg:col-span-7 flex flex-col">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex-1 flex flex-col"
            >
              <div className="neumorphic-card p-6 sm:p-8 flex-1 flex flex-col justify-center">
                {isSubmitted ? (
                  <div className="text-center py-10 space-y-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Thank You for Your Feedback!</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                        Your message has been stored directly into our feedback logs.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsSubmitted(false)}
                      className="mt-2"
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                          Your Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="name"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g. Rahul Sharma"
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all text-sm"
                        />
                      </div>

                      <div>
                        <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          id="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="e.g. rahul@example.com"
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                        Message / Feedback <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="message"
                        rows={4}
                        required
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Share your thoughts, suggestions, or feedback with us..."
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all resize-none text-sm"
                      />
                    </div>

                    {/* Top Centered Error Popup Modal */}
                    <ErrorPopupModal
                      isOpen={!!error}
                      message={error}
                      onClose={() => setError(null)}
                    />

                    {/* Cloudflare Turnstile */}
                    <TurnstileWidget onVerify={(token) => setTurnstileToken(token)} />

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={isSubmitting}
                      icon={<Send className="w-4 h-4" />}
                      className="w-full"
                    >
                      {isSubmitting ? 'Submitting Feedback...' : 'Send Feedback'}
                    </Button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
