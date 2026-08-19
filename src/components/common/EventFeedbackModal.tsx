import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Star,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  User,
  Mail,
  GraduationCap,
  Ticket,
} from 'lucide-react';
import { submitEventFeedback } from '../../services/feedback';
import type { Event } from '../../types/database';

interface EventFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  onSuccessToast?: () => void;
}

const COORDINATION_OPTIONS = [
  { value: '🌟 Excellent - Flawlessly Organized', label: '🌟 Excellent', desc: 'Flawlessly coordinated & on time' },
  { value: '👍 Very Good - Well Coordinated', label: '👍 Very Good', desc: 'Smooth execution & clear communication' },
  { value: '👌 Good - Met Expectations', label: '👌 Good', desc: 'Decent arrangements & coordination' },
  { value: '⚠️ Average - Few Hiccups', label: '⚠️ Average', desc: 'Minor delays or coordination issues' },
  { value: '❌ Poor - Needs Improvement', label: '❌ Poor', desc: 'Disorganized & lacked management' },
];

export const EventFeedbackModal: React.FC<EventFeedbackModalProps> = ({
  isOpen,
  onClose,
  event,
  onSuccessToast,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [registrationId, setRegistrationId] = useState('');
  const [eventRating, setEventRating] = useState<number>(5);
  const [hoverEventRating, setHoverEventRating] = useState<number | null>(null);
  const [engagementRating, setEngagementRating] = useState<number>(5);
  const [hoverEngagementRating, setHoverEngagementRating] = useState<number | null>(null);
  const [coordinationRating, setCoordinationRating] = useState<string>(COORDINATION_OPTIONS[0].value);
  const [feedbackText, setFeedbackText] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!universityId.trim()) {
      setError('Please enter your University ID (UID).');
      return;
    }
    if (!registrationId.trim()) {
      setError('Please enter your Registration ID (e.g., CSC-2026-XXXX).');
      return;
    }
    if (!feedbackText.trim() || feedbackText.trim().length < 5) {
      setError('Please provide your feedback or comments (minimum 5 characters).');
      return;
    }

    setIsSubmitting(true);

    try {
      await submitEventFeedback({
        name: name.trim(),
        email: email.trim(),
        university_id: universityId.trim(),
        registration_id: registrationId.trim(),
        event_id: event.id,
        event_title: event.title,
        event_rating: eventRating,
        engagement_rating: engagementRating,
        coordination_rating: coordinationRating,
        message: feedbackText.trim(),
      });

      setIsSubmitted(true);
      if (onSuccessToast) {
        onSuccessToast();
      }
    } catch (err: any) {
      console.error('Error submitting event feedback:', err);
      setError(err?.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setIsSubmitted(false);
    setError(null);
    setName('');
    setEmail('');
    setUniversityId('');
    setRegistrationId('');
    setEventRating(5);
    setEngagementRating(5);
    setCoordinationRating(COORDINATION_OPTIONS[0].value);
    setFeedbackText('');
    onClose();
  };

  const getRatingLabel = (score: number) => {
    switch (score) {
      case 1:
        return '1 / 5 - Needs Major Improvement';
      case 2:
        return '2 / 5 - Below Expectations';
      case 3:
        return '3 / 5 - Average / Satisfactory';
      case 4:
        return '4 / 5 - Very Good';
      case 5:
        return '5 / 5 - Outstanding & Exceptional';
      default:
        return `${score} / 5`;
    }
  };

  const getEngagementLabel = (score: number) => {
    switch (score) {
      case 1:
        return '1 / 5 - Very Low Engagement';
      case 2:
        return '2 / 5 - Somewhat Passive';
      case 3:
        return '3 / 5 - Moderately Interactive';
      case 4:
        return '4 / 5 - Highly Engaging';
      case 5:
        return '5 / 5 - Super Interactive & Captivating';
      default:
        return `${score} / 5`;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-purple-50/60 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-slate-900 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Event Experience Feedback</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {event.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Share your honest rating and feedback to help us craft even better upcoming experiences.
              </p>
            </div>

            <button
              type="button"
              onClick={resetAndClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800 transition-all cursor-pointer shrink-0"
              aria-label="Close Feedback Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-7 overflow-y-auto space-y-6 custom-scrollbar">
            {isSubmitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 text-center space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                    Thank You for Your Feedback!
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    Your valuable review for <strong className="text-blue-600 dark:text-sky-400">{event.title}</strong> has been recorded and submitted to the Cloud Stack Club team.
                  </p>
                </div>
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={resetAndClose}
                    className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
                  >
                    Done & Close
                  </button>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* 1. Name & Email Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Your Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g., Rahul Sharma"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        required
                        placeholder="e.g., rahul@cumail.in"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. University ID & Registration ID Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      University ID (UID) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <GraduationCap className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g., 24BCF10026"
                        value={universityId}
                        onChange={(e) => setUniversityId(e.target.value.toUpperCase())}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs font-bold font-mono text-blue-600 dark:text-sky-400 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/40 uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Registration ID <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Ticket className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g., CSC-2026-AD9026"
                        value={registrationId}
                        onChange={(e) => setRegistrationId(e.target.value.toUpperCase())}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/40 uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Event Rating & Engagement Rating Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                  {/* Event Rating */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Event Rating <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                        {getRatingLabel(hoverEventRating || eventRating)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const active = star <= (hoverEventRating || eventRating);
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setEventRating(star)}
                            onMouseEnter={() => setHoverEventRating(star)}
                            onMouseLeave={() => setHoverEventRating(null)}
                            className="p-1.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-500/15 transition-all transform hover:scale-125 cursor-pointer"
                          >
                            <Star
                              className={`w-6 h-6 transition-colors ${
                                active
                                  ? 'text-amber-500 fill-amber-400 drop-shadow-sm'
                                  : 'text-slate-300 dark:text-slate-600'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Engagement Rating */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Engagement Rating <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                        {getEngagementLabel(hoverEngagementRating || engagementRating)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const active = star <= (hoverEngagementRating || engagementRating);
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setEngagementRating(star)}
                            onMouseEnter={() => setHoverEngagementRating(star)}
                            onMouseLeave={() => setHoverEngagementRating(null)}
                            className="p-1.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-500/15 transition-all transform hover:scale-125 cursor-pointer"
                          >
                            <Star
                              className={`w-6 h-6 transition-colors ${
                                active
                                  ? 'text-indigo-500 fill-indigo-400 drop-shadow-sm'
                                  : 'text-slate-300 dark:text-slate-600'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 4. Coordination and Management */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    How was the coordination and management of the event? <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {COORDINATION_OPTIONS.map((opt) => {
                      const selected = coordinationRating === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setCoordinationRating(opt.value)}
                          className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                            selected
                              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 text-blue-900 dark:text-white'
                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <span className="text-xs font-bold">{opt.label}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Detailed Feedback / Comments */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Your Feedback & Suggestions <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Tell us what you liked most about the speakers, hands-on sessions, or topics you want in the future..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none leading-relaxed"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={resetAndClose}
                    className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Feedback</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EventFeedbackModal;
