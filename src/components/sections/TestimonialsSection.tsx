import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, Calendar, User, MessageSquare, AlertCircle, Sparkles } from 'lucide-react';
import { SectionTitle } from '../ui/SectionTitle';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';
import { Toast } from '../ui/Toast';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { getTestimonials, createTestimonial, deleteTestimonial } from '../../services/testimonials';
import { getEvents } from '../../services/events';
import type { Testimonial, Event } from '../../types/database';

export const TestimonialsSection: React.FC = () => {
  const { isAdminLoggedIn } = useAdminAuth();

  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [eventsList, setEventsList] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin form state
  const [description, setDescription] = useState('');
  const [selectedEventName, setSelectedEventName] = useState('');
  const [customEventName, setCustomEventName] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete modal state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load testimonials
  const loadTestimonials = useCallback(async () => {
    try {
      const data = await getTestimonials();
      setTestimonials(data);
    } catch (err) {
      console.warn('Could not load testimonials:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load events for the admin dropdown
  const loadEvents = useCallback(async () => {
    try {
      const events = await getEvents();
      setEventsList(events);
    } catch (err) {
      console.warn('Could not load events for testimonials dropdown:', err);
    }
  }, []);

  useEffect(() => {
    loadTestimonials();
    loadEvents();

    const handleUpdate = () => {
      loadTestimonials();
    };

    window.addEventListener('csc-testimonials-updated', handleUpdate);
    return () => {
      window.removeEventListener('csc-testimonials-updated', handleUpdate);
    };
  }, [loadTestimonials, loadEvents]);

  // Handle testimonial creation by Admin
  const handleAddTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanDescription = description.trim();
    const finalEventName = selectedEventName === '__custom__' ? customEventName.trim() : selectedEventName.trim();
    const cleanAuthorName = authorName.trim();

    if (!cleanDescription) {
      setFormError('Please enter a testimonial description.');
      return;
    }
    if (!finalEventName) {
      setFormError('Please select or specify an event name.');
      return;
    }
    if (!cleanAuthorName) {
      setFormError('Please enter the author name.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Find matching event id if available
      const matchedEvent = eventsList.find((ev) => ev.title.trim().toLowerCase() === finalEventName.toLowerCase());

      const res = await createTestimonial({
        testimonial_description: cleanDescription,
        event_name: finalEventName,
        event_id: matchedEvent ? matchedEvent.id : null,
        author_name: cleanAuthorName,
        display_order: testimonials.length + 1,
      });

      if (res.success) {
        setToastMessage({ type: 'success', message: 'Testimonial successfully added!' });
        setDescription('');
        setSelectedEventName('');
        setCustomEventName('');
        setAuthorName('');
      } else {
        setFormError(res.error || 'Failed to add testimonial.');
      }
    } catch (err: any) {
      setFormError(err?.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle testimonial removal
  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);

    try {
      const res = await deleteTestimonial(deletingId);
      if (res.success) {
        setToastMessage({ type: 'success', message: 'Testimonial removed.' });
      } else {
        setToastMessage({ type: 'error', message: res.error || 'Failed to remove testimonial.' });
      }
    } catch (err: any) {
      setToastMessage({ type: 'error', message: err?.message || 'Failed to remove testimonial.' });
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  return (
    <section id="testimonials" className="py-20 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle
          badge="Event Testimonials"
          title="What Participants Say"
          subtitle="Real stories, feedback, and experiences from students who participated in our club hackathons, workshops, and bootcamps."
        />

        {/* ========================================================================= */}
        {/* ADMIN CREATION PANEL (Visible only when Admin is logged in)             */}
        {/* ========================================================================= */}
        {isAdminLoggedIn && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-14 max-w-2xl mx-auto"
          >
            <div className="bg-slate-900/90 dark:bg-slate-900/90 border-2 border-blue-500/40 rounded-2xl p-6 sm:p-7 shadow-2xl shadow-blue-500/10 backdrop-blur-md">
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-wide">Admin: Add Testimonial</h3>
                    <p className="text-xs text-slate-400">Post a new participant testimonial to the main page</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Admin Mode
                </span>
              </div>

              <form onSubmit={handleAddTestimonial} className="space-y-4">
                {formError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2.5 text-red-400 text-xs font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* 1. Testimonial Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Testimonial Description
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter what the participant said about the event..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-y min-h-[90px]"
                    required
                  />
                </div>

                {/* 2. Event Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Event
                  </label>
                  <div className="relative">
                    <select
                      value={selectedEventName}
                      onChange={(e) => setSelectedEventName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors appearance-none cursor-pointer"
                      required
                    >
                      <option value="" disabled>
                        Select Event from Database
                      </option>
                      {eventsList.map((evt) => (
                        <option key={evt.id} value={evt.title}>
                          {evt.title} ({evt.status || 'Event'})
                        </option>
                      ))}
                      <option value="__custom__">+ Enter other / past event name...</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>

                  {selectedEventName === '__custom__' && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={customEventName}
                        onChange={(e) => setCustomEventName(e.target.value)}
                        placeholder="Enter custom event name (e.g. Elevate-X 2024)"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-700/80 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                  )}
                </div>

                {/* 3. Author Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Author Name:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      required
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isSubmitting}
                    icon={<Plus className="w-4 h-4" />}
                    className="w-full sm:w-auto font-semibold shadow-lg shadow-blue-600/30"
                  >
                    {isSubmitting ? 'Adding...' : 'Add Testimonial'}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TESTIMONIALS DISPLAY CARDS (Rendered for both Users & Admins)             */}
        {/* Layout matching user design:                                             */}
        {/* - Top Left: Event Name                                                   */}
        {/* - Center: testimonial description                                        */}
        {/* - Bottom Right: ~author name                                             */}
        {/* - If Admin: Remove button in corner                                      */}
        {/* ========================================================================= */}
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
            {isAdminLoggedIn && (
              <p className="text-xs text-blue-400 mt-1">Use the form above to add the first testimonial!</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <AnimatePresence>
              {testimonials.map((t, idx) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, delay: idx * 0.08 }}
                  className="h-full"
                >
                  {/* Card Container */}
                  <div className="relative h-full flex flex-col justify-between rounded-2xl bg-slate-900/60 dark:bg-slate-900/60 border border-slate-800 hover:border-blue-500/50 transition-all duration-300 p-6 sm:p-7 shadow-lg shadow-black/20 hover:shadow-blue-500/5 group backdrop-blur-sm">
                    
                    {/* Header: Event Name & Admin Delete Button */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 dark:text-sky-300 text-xs font-semibold tracking-wide">
                        <Calendar className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                        <span className="truncate max-w-[200px]" title={t.event_name}>
                          {t.event_name}
                        </span>
                      </div>

                      {/* Admin Remove Button (visible only to logged-in admin) */}
                      {isAdminLoggedIn && (
                        <button
                          type="button"
                          onClick={() => setDeletingId(t.id)}
                          title="Remove Testimonial"
                          className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg border border-transparent hover:border-red-500/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Body: Testimonial Description */}
                    <div className="my-auto py-2">
                      <p className="text-slate-300 dark:text-slate-300 text-sm sm:text-base leading-relaxed font-normal whitespace-pre-line">
                        "{t.testimonial_description}"
                      </p>
                    </div>

                    {/* Footer: ~author name (aligned right as in mockup) */}
                    <div className="pt-4 mt-2 border-t border-slate-800/60 flex justify-end">
                      <span className="text-xs sm:text-sm font-medium text-slate-400 dark:text-slate-400 italic">
                        ~{t.author_name}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal for Admin */}
      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        title="Remove Testimonial"
        message="Are you sure you want to remove this testimonial from the main page? This action cannot be undone."
        confirmText={isDeleting ? 'Removing...' : 'Remove'}
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          isVisible={!!toastMessage}
          message={toastMessage.message}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}
    </section>
  );
};
