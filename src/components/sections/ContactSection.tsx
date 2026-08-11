import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Mail, Send, Sparkles, AlertCircle } from 'lucide-react';
import { LinkedinIcon, InstagramIcon } from '../ui/SocialIcons';
import { SectionTitle } from '../ui/SectionTitle';
import { Button } from '../ui/Button';
import { Toast } from '../ui/Toast';
import { siteConfig } from '../../constants/siteConfig';
import { sendContactMessage } from '../../services/emailService';

export const ContactSection: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await sendContactMessage(formData);
      setFormData({ name: '', email: '', message: '' });
      setShowToast(true);
    } catch {
      setError('Failed to send. Please try again or email us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-20 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle
          badge="Get in Touch"
          title="Contact Us"
          subtitle="Have questions, want to partner with Cloud Stack Club, or interested in hosting a session at Chandigarh University? Reach out to us below."
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Side Info Cards */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Location Card */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="neumorphic-card p-6 flex items-start gap-4">
                <div className="neumorphic-icon p-3 text-blue-600 dark:text-sky-400 shrink-0">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">Location</h4>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {siteConfig.contact.location}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Email Card */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="neumorphic-card p-6 flex items-start gap-4">
                <div className="neumorphic-icon p-3 text-sky-600 dark:text-sky-400 shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">Email Us</h4>
                  <p className="mt-1 text-sm font-mono text-blue-600 dark:text-sky-400">
                    {siteConfig.contact.email}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Social Links Card (Club Credentials: LinkedIn & Instagram) */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="neumorphic-card p-6 space-y-4">
                <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  Follow Our Social Channels
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <a
                    href={siteConfig.contact.socials.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl neumorphic-card flex items-center justify-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-sky-400 transition-all"
                  >
                    <LinkedinIcon className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>LinkedIn</span>
                  </a>
                  <a
                    href={siteConfig.contact.socials.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl neumorphic-card flex items-center justify-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-pink-600 dark:hover:text-pink-400 transition-all"
                  >
                    <InstagramIcon className="w-4 h-4 text-pink-600 shrink-0" />
                    <span>Instagram</span>
                  </a>
                </div>
              </div>
            </motion.div>

          </div>

          {/* Right Side Form */}
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="neumorphic-card p-6 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      Your Name
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
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. rahul@cumail.in"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      Message
                    </label>
                    <textarea
                      id="message"
                      rows={4}
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="How can we assist you or collaborate?"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all resize-none text-sm"
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={isSubmitting}
                    icon={<Send className="w-4 h-4" />}
                    className="w-full"
                  >
                    {isSubmitting ? 'Sending Message...' : 'Send Message'}
                  </Button>
                </form>
              </div>
            </motion.div>
          </div>

        </div>
      </div>

      {/* Success Toast */}
      <Toast
        isVisible={showToast}
        message="Thank you! Your message has been sent successfully. We will get back to you soon."
        onClose={() => setShowToast(false)}
      />
    </section>
  );
};
