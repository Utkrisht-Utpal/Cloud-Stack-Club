import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Mail,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Archive,
  RefreshCw,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import type { FeedbackStatus } from '../../types/database';

interface UpdateFeedbackStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedback: any | null;
  isEvent: boolean;
  targetStatus: FeedbackStatus;
  onConfirm: (
    feedback: any,
    newStatus: FeedbackStatus,
    adminNote: string,
    sendEmail: boolean
  ) => Promise<void>;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'resolved':
    case 'responded':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" />
          Resolved
        </span>
      );
    case 'in_progress':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500/15 text-blue-700 dark:text-sky-400 border border-blue-500/20">
          <RefreshCw className="w-3 h-3" />
          In Progress
        </span>
      );
    case 'archived':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-500/15 text-slate-700 dark:text-slate-400 border border-slate-500/20">
          <Archive className="w-3 h-3" />
          Archived
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
          <Clock className="w-3 h-3" />
          Pending
        </span>
      );
  }
};

export const UpdateFeedbackStatusModal: React.FC<UpdateFeedbackStatusModalProps> = ({
  isOpen,
  onClose,
  feedback,
  isEvent,
  targetStatus,
  onConfirm,
}) => {
  const [note, setNote] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presets: string[] = React.useMemo(() => {
    if (isEvent) {
      if (targetStatus === 'resolved') {
        return [
          "Thank you for sharing your feedback! We have reviewed your suggestions and will implement improvements in our upcoming events.",
          "We appreciate your kind words and attendance! Hope to see you at our next workshop and hackathon.",
          "Your feedback has been noted by the club coordinators and reviewed with the organizing team.",
        ];
      }
      if (targetStatus === 'in_progress') {
        return [
          "We have acknowledged your event feedback and our technical team is currently reviewing your suggestions.",
          "Our event coordinators are reviewing your submission regarding this session.",
        ];
      }
      if (targetStatus === 'archived') {
        return [
          "This event feedback has been documented and archived for future post-event reviews.",
        ];
      }
      return ["Feedback status set to Pending for further review."];
    } else {
      if (targetStatus === 'resolved') {
        return [
          "Your inquiry has been addressed and resolved. Thank you for reaching out to Cloud Stack Club!",
          "We have reviewed your question and taken the required actions. Feel free to contact us if you need anything else.",
          "Issue resolved by the club administration. Let us know if you need further guidance.",
        ];
      }
      if (targetStatus === 'in_progress') {
        return [
          "We have received your message and our team is actively looking into your query.",
          "Your inquiry is currently being handled by the coordinators. We will update you shortly.",
        ];
      }
      if (targetStatus === 'archived') {
        return [
          "This inquiry has been reviewed and archived. Thank you for your interest in Cloud Stack Club.",
        ];
      }
      return ["Inquiry status set to Pending for review by the team."];
    }
  }, [isEvent, targetStatus]);

  useEffect(() => {
    if (isOpen) {
      setNote(presets[0] || '');
      setSendEmail(true);
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, presets]);

  if (!feedback) return null;

  const currentStatus =
    feedback.status === 'unread'
      ? 'pending'
      : feedback.status === 'responded'
        ? 'resolved'
        : feedback.status || 'pending';

  const recipientName = feedback.name || 'Valued User';
  const recipientEmail = feedback.email || '';
  const itemTitle = isEvent
    ? feedback.event_title || 'Event Feedback'
    : feedback.subject || 'General Inquiry';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sendEmail && !note.trim()) {
      setError('Please provide feedback notes or a response message for the recipient.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onConfirm(feedback, targetStatus, note.trim(), sendEmail);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update status. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEvent ? 'Event Feedback Status Update' : 'Inquiry Status Update'}
      maxWidth="max-w-xl"
      hideCloseButton={true}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && (
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-1.5">
              {isEvent ? (
                <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
              ) : (
                <MessageSquare className="w-4 h-4 text-blue-500 shrink-0" />
              )}
              <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate max-w-[280px]">
                {itemTitle}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {getStatusBadge(currentStatus)}
              <ArrowRight className="w-3 h-3 text-slate-400" />
              {getStatusBadge(targetStatus)}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recipient:</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">{recipientName}</p>
            </div>
            <div className="sm:text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Email Address:</span>
              <p className="font-mono text-slate-600 dark:text-slate-300 mt-0.5 truncate">{recipientEmail || 'N/A'}</p>
            </div>
          </div>

          {feedback.message && (
            <div className="pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Original Message:</span>
              <p className="mt-1 p-2 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 italic line-clamp-3 leading-relaxed">
                "{feedback.message}"
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900 dark:text-white">
              Admin Response / Feedback Notes:
            </label>
            <span className="text-[10px] text-slate-400 font-semibold">
              {note.length} characters
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Quick Suggestions:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((presetText, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setNote(presetText)}
                  className="text-left text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-sky-400 transition-colors border border-slate-200/60 dark:border-slate-700/60 cursor-pointer line-clamp-1 max-w-full"
                >
                  {presetText}
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            disabled={isSubmitting}
            placeholder="Enter response notes or feedback for the user..."
            className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 leading-relaxed"
          />
        </div>

        <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Mail className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-slate-900 dark:text-white">
                Send email notification to recipient
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Dispatches an automated email from the club account with your feedback notes.
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
            disabled={isSubmitting || !recipientEmail}
            className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting || (sendEmail && !note.trim())}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer shadow-md shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                <span>Updating &amp; Sending...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 shrink-0" />
                <span>{sendEmail ? 'Update & Send Email' : 'Update Status Only'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
