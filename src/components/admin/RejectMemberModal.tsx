import React, { useState, useEffect } from 'react';
import { Mail, Send } from 'lucide-react';
import { Modal } from '../ui/Modal';
import type { Member } from '../../types';

interface RejectMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  onConfirmReject: (member: Member, reason: string) => Promise<void>;
}

const PRESET_REASONS = [
  'Incomplete verification details or invalid student ID proof.',
  'Prerequisites and technical requirements not met for this intake cycle.',
  'Maximum member capacity reached for your selected department.',
  'Application submitted after the recruitment deadline.',
];

export const RejectMemberModal: React.FC<RejectMemberModalProps> = ({
  isOpen,
  onClose,
  member,
  onConfirmReject,
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!member) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason or constructive feedback for the applicant.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onConfirmReject(member, reason.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to reject application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reject Membership Application"
      maxWidth="max-w-xl"
      hideCloseButton={true}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Applicant Summary Card */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
              {member.name}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
              <span>{member.email}</span>
              {member.registration_id && (
                <>
                  <span className="text-slate-300 dark:text-slate-600 font-bold">•</span>
                  <span className="font-mono">{member.registration_id}</span>
                </>
              )}
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
            Pending Application
          </span>
        </div>

        {/* Preset Reason Chips */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Quick Feedback Presets:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_REASONS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setReason(preset)}
                className="text-[11px] px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800 transition-colors text-left"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Feedback Textarea */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>Rejection Reason / Constructive Feedback:</span>
            <span className="text-[10px] text-slate-400">Included in the email</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="Explain why the application was declined and how they can improve for future recruitments..."
            className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 transition-all outline-none resize-none"
            required
          />
        </div>

        {/* Notification Warning */}
        <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
          <Mail className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">
            Submitting will mark <strong>{member.name}</strong> as inactive and automatically dispatch an official rejection email with your feedback from the club's official email account.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold">
            {error}
          </div>
        )}

        {/* Modal Actions */}
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
            disabled={isSubmitting || !reason.trim()}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer shadow-md shadow-red-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                <span>Sending &amp; Rejecting...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 shrink-0" />
                <span>Reject &amp; Send Email</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
