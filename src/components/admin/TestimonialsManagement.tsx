import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Plus,
  Trash2,
  Calendar,
  User,
  Sparkles,
  AlertCircle,
  Eye,
  RefreshCw,
  Search,
  ExternalLink,
  Briefcase,
  ListOrdered,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';
import { Toast } from '../ui/Toast';
import { getTestimonials, createTestimonial, deleteTestimonial } from '../../services/testimonials';
import { getEvents } from '../../services/events';
import type { Testimonial, Event } from '../../types/database';

export const TestimonialsManagement: React.FC = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [eventsList, setEventsList] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add form states
  const [description, setDescription] = useState('');
  const [selectedEventName, setSelectedEventName] = useState('');
  const [customEventName, setCustomEventName] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorPosition, setAuthorPosition] = useState('');
  const [displayOrder, setDisplayOrder] = useState<number | string>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete modal state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedTestimonials, fetchedEvents] = await Promise.all([
        getTestimonials(),
        getEvents(),
      ]);
      setTestimonials(fetchedTestimonials);
      setEventsList(fetchedEvents);
      setDisplayOrder(fetchedTestimonials.length + 1);
    } catch (err) {
      console.warn('Error loading testimonials data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      getTestimonials().then((data) => {
        setTestimonials(data);
        setDisplayOrder(data.length + 1);
      }).catch(console.warn);
    };

    window.addEventListener('csc-testimonials-updated', handleUpdate);
    return () => {
      window.removeEventListener('csc-testimonials-updated', handleUpdate);
    };
  }, [loadData]);

  // Handle testimonial submission
  const handleAddTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanDescription = description.trim();
    const finalEventName =
      selectedEventName === '__custom__' ? customEventName.trim() : selectedEventName.trim();
    const cleanAuthorName = authorName.trim();

    if (!cleanDescription) {
      setFormError('Please enter a testimonial description.');
      return;
    }
    if (!finalEventName) {
      setFormError('Please select or enter an event name.');
      return;
    }
    if (!cleanAuthorName) {
      setFormError('Please enter the author name.');
      return;
    }

    setIsSubmitting(true);

    try {
      const matchedEvent = eventsList.find(
        (ev) => ev.title.trim().toLowerCase() === finalEventName.toLowerCase()
      );

      const parsedOrder = typeof displayOrder === 'number' ? displayOrder : parseInt(String(displayOrder), 10);
      const finalOrder = isNaN(parsedOrder) || parsedOrder <= 0 ? testimonials.length + 1 : parsedOrder;

      const res = await createTestimonial({
        testimonial_description: cleanDescription,
        event_name: finalEventName,
        event_id: matchedEvent ? matchedEvent.id : null,
        author_name: cleanAuthorName,
        author_position: authorPosition.trim() || null,
        display_order: finalOrder,
      });

      if (res.success) {
        setToastMessage({ type: 'success', message: 'Testimonial created successfully!' });
        setDescription('');
        setSelectedEventName('');
        setCustomEventName('');
        setAuthorName('');
        setAuthorPosition('');
        setDisplayOrder(testimonials.length + 2);
      } else {
        setFormError(res.error || 'Failed to create testimonial.');
      }
    } catch (err: any) {
      setFormError(err?.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle testimonial deletion
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

  // Filtered testimonials
  const filteredTestimonials = testimonials.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      t.event_name.toLowerCase().includes(q) ||
      t.author_name.toLowerCase().includes(q) ||
      t.testimonial_description.toLowerCase().includes(q)
    );
  });

  const previewEventName =
    selectedEventName === '__custom__'
      ? customEventName || 'Your Event Name'
      : selectedEventName || 'Event Name';
  const previewAuthorName = authorName.trim() || 'Author Name';
  const previewDescription =
    description.trim() || 'The testimonial description will be displayed here in this card format.';

  return (
    <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Testimonials Management</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-500/20">
                {testimonials.length} Active
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Add new participant testimonials on the left and preview/manage live user cards on the right.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <a
            href="/#testimonials"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View on Main Page</span>
          </a>
        </div>
      </div>

      {/* Two-Column Layout: Left (Add Testimonial) | Right (Testimonial Previews) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* ===================================================================== */}
        {/* LEFT SIDE: Add Testimonial Form (matching user wireframe)             */}
        {/* ===================================================================== */}
        <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between lg:h-[660px]">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Add Testimonial
              </h3>
            </div>

            <form id="add-testimonial-form" onSubmit={handleAddTestimonial} className="space-y-3.5">
              {formError && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-500 dark:text-red-400 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. testimonial description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Testimonial Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter what the participant said about the event..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none h-[95px]"
                  required
                />
              </div>

              {/* 2. Event & Order (Side-by-Side) */}
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-8 sm:col-span-8">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Event <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedEventName}
                      onChange={(e) => setSelectedEventName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors appearance-none cursor-pointer"
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
                </div>

                <div className="col-span-4 sm:col-span-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 truncate" title="Display Order">
                    Order <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      value={displayOrder}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') setDisplayOrder('');
                        else setDisplayOrder(Math.max(1, parseInt(val, 10) || 1));
                      }}
                      placeholder="1"
                      className="w-full pl-3 pr-8 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      required
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                      <ListOrdered className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>

              {selectedEventName === '__custom__' && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={customEventName}
                    onChange={(e) => setCustomEventName(e.target.value)}
                    placeholder="Enter custom event name (e.g. Elevate-X 2024)"
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              )}

              {/* 3. Author Name: */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Author Name: <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    required
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* 4. Department / Position: */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Department / Position:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={authorPosition}
                    onChange={(e) => setAuthorPosition(e.target.value)}
                    placeholder="e.g. CSE - 3rd Year / Full Stack Lead"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                    <Briefcase className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Submit Button anchored at the bottom */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80">
            <button
              type="submit"
              form="add-testimonial-form"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 active:scale-[0.99] text-white font-bold text-sm tracking-wide shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Adding Testimonial...' : 'Add Testimonial +'}</span>
            </button>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* RIGHT SIDE: Testimonial Previews (User View)                          */}
        {/* Exact same height (lg:h-[660px]) with styled sleek custom scrollbar  */}
        {/* ===================================================================== */}
        <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col lg:h-[660px]">
          
          {/* Header & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                User Testimonial Previews
              </span>
            </div>

            <div className="relative w-full sm:w-56">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search testimonials..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            </div>
          </div>

          {/* Scrollable Container with Website Look-and-Feel Scrollbar */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3.5 pr-1.5 custom-scrollbar [scrollbar-width:thin] [scrollbar-color:rgba(59,130,246,0.3)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700/60 hover:[&::-webkit-scrollbar-thumb]:bg-blue-500/50 [&::-webkit-scrollbar-thumb]:rounded-full transition-colors">
            
            {/* Live Draft Card Preview (while typing) */}
            {(description.trim() || authorName.trim() || authorPosition.trim() || selectedEventName) && (
              <div className="border-2 border-dashed border-blue-500/40 rounded-2xl p-4 sm:p-5 bg-blue-50/20 dark:bg-blue-500/5 relative">
                <span className="absolute top-2.5 right-3 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500 text-white shadow-sm">
                  Live Draft Preview
                </span>

                {/* Exact user card layout from wireframe */}
                <div className="flex flex-col justify-between pt-1">
                  {/* Event Name & Order */}
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-sky-300 text-xs font-bold w-fit">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      <span>{previewEventName}</span>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700/60">
                      #{displayOrder || 1}
                    </span>
                  </div>

                  {/* testimonial description */}
                  <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed my-1.5 italic">
                    "{previewDescription}"
                  </p>

                  {/* ~author name & department/position */}
                  <div className="flex flex-col items-end pt-2 border-t border-slate-200 dark:border-slate-800 mt-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      ~{previewAuthorName}
                    </span>
                    {authorPosition.trim() && (
                      <span className="text-[11px] font-normal text-slate-400/80 dark:text-slate-400/80 mt-0.5">
                        {authorPosition.trim()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Published Testimonial Cards List */}
            {loading ? (
              <div className="py-12 flex justify-center items-center">
                <div className="w-8 h-8 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : filteredTestimonials.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <MessageSquare className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
                <p className="text-xs font-semibold text-slate-500">No testimonials match your filter.</p>
              </div>
            ) : (
              <AnimatePresence>
                {filteredTestimonials.map((t) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all group"
                  >
                    {/* Header: Event Name, Order Badge + Delete Button */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-sky-300 text-xs font-bold">
                          <Calendar className="w-3.5 h-3.5 text-blue-500" />
                          <span className="truncate max-w-[200px]">{t.event_name}</span>
                        </div>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60">
                          #{t.display_order}
                        </span>
                      </div>

                      {/* Admin Delete Action */}
                      <button
                        type="button"
                        onClick={() => setDeletingId(t.id)}
                        title="Delete Testimonial"
                        className="text-slate-400 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Body: testimonial description */}
                    <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed my-2 whitespace-pre-line">
                      "{t.testimonial_description}"
                    </p>

                    {/* Footer: ~author name & department/position */}
                    <div className="flex flex-col items-end pt-2 border-t border-slate-100 dark:border-slate-800/80 mt-2">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 italic">
                        ~{t.author_name}
                      </span>
                      {t.author_position && (
                        <span className="text-[11px] font-normal text-slate-400/80 dark:text-slate-400/80 mt-0.5">
                          {t.author_position}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        title="Remove Testimonial"
        message="Are you sure you want to remove this testimonial? It will be removed from both the Admin Panel and the public Main Page."
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
    </div>
  );
};
