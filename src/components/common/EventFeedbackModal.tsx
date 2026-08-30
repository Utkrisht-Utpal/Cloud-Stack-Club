import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Star,
  Sparkles,
  Send,
  CheckCircle2,
  User,
  Mail,
  Phone,
  GraduationCap,
  Ticket,
} from 'lucide-react';
import {
  submitEventFeedback,
} from '../../services/feedback';
import type { Event } from '../../types/database';
import { ErrorPopupModal } from './ErrorPopupModal';
import { TurnstileWidget, resetTurnstile } from './TurnstileWidget';
import { useSubmitCooldown } from '../../hooks/useSubmitCooldown';

interface EventFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  onSuccessToast?: () => void;
}

export const EventFeedbackModal: React.FC<EventFeedbackModalProps> = ({
  isOpen,
  onClose,
  event,
  onSuccessToast,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [registrationId, setRegistrationId] = useState('');
  const [eventRating, setEventRating] = useState<number>(5);
  const [hoverEventRating, setHoverEventRating] = useState<number | null>(null);
  const [coordinationRating, setCoordinationRating] = useState<number>(10);
  const [hoverCoordinationRating, setHoverCoordinationRating] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const { cooldown, isCoolingDown, startCooldown, resetCooldown } = useSubmitCooldown(9);

  React.useEffect(() => {
    if (isOpen) {
      const count = parseInt(document.body.dataset.modalCount || '0', 10) + 1;
      document.body.dataset.modalCount = count.toString();
      if (count === 1) {
        document.body.style.setProperty('overflow', 'hidden', 'important');
        document.documentElement.style.setProperty('overflow', 'hidden', 'important');
      }

      return () => {
        const newCount = Math.max(0, parseInt(document.body.dataset.modalCount || '1', 10) - 1);
        document.body.dataset.modalCount = newCount.toString();
        if (newCount === 0) {
          document.body.style.overflow = '';
          document.documentElement.style.overflow = '';
        }
      };
    }
  }, [isOpen]);

  React.useEffect(() => {
    const handleCloseAll = () => {
      if (isOpen) onClose();
    };
    window.addEventListener('close-all-modals', handleCloseAll);
    return () => window.removeEventListener('close-all-modals', handleCloseAll);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const triggerErrorWithCooldown = (msg: string) => {
    setError(msg);
    setTurnstileToken('');
    resetTurnstile();
    startCooldown(9);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCoolingDown || isSubmitting) return;
    setError(null);

    if (!name.trim()) {
      triggerErrorWithCooldown('Please provide your full name.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      triggerErrorWithCooldown('Please enter a valid email address.');
      return;
    }
    if (!universityId.trim()) {
      triggerErrorWithCooldown('Please enter your University ID (UID).');
      return;
    }
    if (universityId.trim().length !== 10) {
      triggerErrorWithCooldown('University ID (UID) must be exactly 10 alphanumeric characters.');
      return;
    }
    if (!registrationId.trim()) {
      triggerErrorWithCooldown('Please enter your Registration ID.');
      return;
    }
    if (!phone.trim() || !/^\d{10}$/.test(phone.trim())) {
      triggerErrorWithCooldown('Phone number is required and must be exactly 10 digits.');
      return;
    }
    if (!feedbackText.trim() || feedbackText.trim().length < 5) {
      triggerErrorWithCooldown('Please provide your feedback or comments (minimum 5 characters).');
      return;
    }

    if (import.meta.env.VITE_TURNSTILE_SITE_KEY && !turnstileToken) {
      triggerErrorWithCooldown('Please complete the security check.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Direct submission via Worker Zero-Trust Gateway (atomic 4-way validation & duplicate check)
      await submitEventFeedback({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        university_id: universityId.trim().toUpperCase(),
        registration_id: registrationId.trim().toUpperCase(),
        event_id: event.id,
        event_title: event.title,
        event_rating: eventRating,
        coordination_rating: `${coordinationRating} / 10 - ${getCoordinationLabel(coordinationRating).replace(/^\d+\s*\/\s*\d+\s*-\s*/, '')}`,
        message: feedbackText.trim(),
        turnstileToken,
      });

      setIsSubmitted(true);
      resetCooldown();
      if (onSuccessToast) {
        onSuccessToast();
      }
    } catch (err: any) {
      console.error('Error submitting event feedback:', err);
      triggerErrorWithCooldown(err?.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setIsSubmitted(false);
    setError(null);
    resetCooldown();
    setName('');
    setEmail('');
    setPhone('');
    setUniversityId('');
    setRegistrationId('');
    setEventRating(5);
    setCoordinationRating(10);
    setHoverCoordinationRating(null);
    setFeedbackText('');
    setTurnstileToken('');
    onClose();
  };

  const getRatingLabel = (score: number) => {
    switch (score) {
      case 1:
        return '1 / 5 - Needs Improvement';
      case 2:
        return '2 / 5 - Below Expectations';
      case 3:
        return '3 / 5 - Satisfactory';
      case 4:
        return '4 / 5 - Very Good';
      case 5:
        return '5 / 5 - Outstanding';
      default:
        return `${score} / 5`;
    }
  };

  const getCoordinationLabel = (score: number) => {
    switch (score) {
      case 10:
        return '10 / 10 - Flawless & Outstanding';
      case 9:
        return '9 / 10 - Exceptional Execution';
      case 8:
        return '8 / 10 - Very Well Coordinated';
      case 7:
        return '7 / 10 - Good Management';
      case 6:
        return '6 / 10 - Satisfactory';
      case 5:
        return '5 / 10 - Average Arrangements';
      case 4:
        return '4 / 10 - Minor Coordination Issues';
      case 3:
        return '3 / 10 - Noticeable Delays';
      case 2:
        return '2 / 10 - Poorly Managed';
      case 1:
        return '1 / 10 - Disorganized';
      default:
        return `${score} / 10`;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col"
        >
          {/* Compact Header */}
          <div className="px-5 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-purple-50/60 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-slate-900 flex items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                  <span>Feedback</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                  {event.title}
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Share your rating and feedback to help us craft better upcoming experiences.
              </p>
            </div>

            <button
              type="button"
              onClick={resetAndClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800 transition-all cursor-pointer shrink-0"
              aria-label="Close Feedback Modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Body - Compact & Non-Scrollable */}
          <div className="p-4 sm:p-5">
            {isSubmitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 text-center space-y-3"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xl font-black text-slate-900 dark:text-white">
                    Thank You for Your Feedback!
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    Your valuable review for <strong className="text-blue-600 dark:text-sky-400">{event.title}</strong> has been recorded.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={resetAndClose}
                    className="px-6 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Top Centered Error Popup Modal */}
                <ErrorPopupModal
                  isOpen={!!error}
                  message={error}
                  onClose={() => setError(null)}
                />

                {/* 1. Name & Email Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Your Name <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g., Rahul Sharma"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Email Address <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        required
                        placeholder="e.g., rahul@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. University ID & Registration ID Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      University ID (UID) <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <GraduationCap className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        maxLength={10}
                        placeholder="University ID (UID)"
                        value={universityId}
                        onChange={(e) => setUniversityId(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase())}
                        className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs sm:text-sm font-bold font-mono text-blue-600 dark:text-sky-400 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/40 uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Registration ID <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <Ticket className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="Registration ID"
                        value={registrationId}
                        onChange={(e) => setRegistrationId(e.target.value.toUpperCase())}
                        className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/40 uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Phone Number & Event Rating (Single Line Each) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Phone Number (Required 10 Digits) */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Phone Number <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        required
                        pattern="[0-9]{10}"
                        maxLength={10}
                        placeholder="10-digit Phone Number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      />
                    </div>
                  </div>

                  {/* Event Rating (Single Line Box with matched height & outer label) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1 flex-nowrap">
                      <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        Event Rating <span className="text-red-500 font-bold">*</span>
                      </label>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                        {getRatingLabel(hoverEventRating || eventRating)}
                      </span>
                    </div>

                    <div className="w-full h-[42px] sm:h-[48px] px-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between sm:justify-start gap-1 sm:gap-2">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const active = star <= (hoverEventRating || eventRating);
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setEventRating(star)}
                            onMouseEnter={() => setHoverEventRating(star)}
                            onMouseLeave={() => setHoverEventRating(null)}
                            className="p-1 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-500/15 transition-all transform hover:scale-125 cursor-pointer"
                          >
                            <Star
                              className={`w-5 sm:w-6 h-5 sm:h-6 transition-colors ${
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
                </div>

                {/* 4. Coordination & Event Management (Single Line 1-10 Scale in Subtle Green) */}
                <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/60 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-nowrap">
                    <label className="text-[11px] font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300 whitespace-nowrap">
                      Coordination & Event Management <span className="text-red-500 font-bold">*</span>
                    </label>
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      {getCoordinationLabel(hoverCoordinationRating || coordinationRating)}
                    </span>
                  </div>

                  {/* 1 to 10 Scale Single Row */}
                  <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                      const isSelected = coordinationRating === score;
                      const isHovered = hoverCoordinationRating !== null && hoverCoordinationRating >= score;
                      return (
                        <button
                          key={score}
                          type="button"
                          onClick={() => setCoordinationRating(score)}
                          onMouseEnter={() => setHoverCoordinationRating(score)}
                          onMouseLeave={() => setHoverCoordinationRating(null)}
                          className={`h-8 sm:h-9 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center border ${
                            isSelected
                              ? 'bg-emerald-600 dark:bg-emerald-500 text-white border-emerald-600 dark:border-emerald-500 shadow-md shadow-emerald-500/25 scale-[1.05]'
                              : isHovered
                              ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100 border-emerald-400'
                              : 'bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          }`}
                        >
                          {score}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-bold text-emerald-700/60 dark:text-emerald-400/60 px-0.5">
                    <span>1 - Poor</span>
                    <span>5 - Average</span>
                    <span>10 - Outstanding</span>
                  </div>
                </div>

                {/* 5. Detailed Feedback / Comments */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Your Feedback & Suggestions <span className="text-red-500 font-bold">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Tell us what you liked most about the session, speakers, or topics for future events..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    className="w-full p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none leading-relaxed min-h-[72px]"
                  />
                </div>

                {/* Cloudflare Turnstile */}
                <TurnstileWidget onVerify={(token) => setTurnstileToken(token)} />

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-1.5">
                  <button
                    type="button"
                    onClick={resetAndClose}
                    className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || isCoolingDown}
                    className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-black shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : isCoolingDown ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                        <span>Submit in {cooldown}s</span>
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
