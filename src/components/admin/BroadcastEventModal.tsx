import React, { useState, useEffect } from 'react';
import { Send, AlertCircle, Users, CheckCircle, Calendar, MapPin } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { Event } from '../../types';
import { fetchAllRegisteredUsersForBroadcast, sendEventBroadcastEmail } from '../../services/email';
import { formatEventDate, formatEventTime } from '../../utils/formatters';

interface BroadcastEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  onBroadcastSuccess?: () => void;
}

export const BroadcastEventModal: React.FC<BroadcastEventModalProps> = ({
  isOpen,
  onClose,
  event,
  onBroadcastSuccess,
}) => {
  const [recipients, setRecipients] = useState<Array<{ email: string; name?: string }>>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ sent: number; total: number } | null>(null);

  useEffect(() => {
    if (isOpen && event) {
      setSuccessResult(null);
      setError(null);
      setLoadingRecipients(true);
      fetchAllRegisteredUsersForBroadcast()
        .then((users) => {
          setRecipients(users);
        })
        .catch((err) => {
          console.error('Failed to load broadcast recipients:', err);
          setError('Could not fetch registered recipient list.');
        })
        .finally(() => {
          setLoadingRecipients(false);
        });
    }
  }, [isOpen, event]);

  if (!event) return null;

  const handleBroadcast = async () => {
    if (recipients.length === 0) {
      setError('No registered recipients found.');
      return;
    }

    setIsBroadcasting(true);
    setError(null);

    try {
      const result = await sendEventBroadcastEmail(
        {
          title: event.title,
          date: event.date || '',
          start_time: event.start_time || undefined,
          location: event.location || 'Chandigarh University',
          description: event.description || undefined,
          image_url: event.image_url || undefined,
          slug: event.slug || undefined,
        },
        recipients
      );

      setSuccessResult({
        sent: result.sentCount || recipients.length,
        total: recipients.length,
      });

      onBroadcastSuccess?.();
    } catch (err: any) {
      setError(err?.message || 'Failed to broadcast event announcement.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Broadcast Event Announcement"
      maxWidth="max-w-2xl"
      hideCloseButton={true}
    >
      <div className="space-y-6">
        {successResult ? (
          <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                Event Broadcast Dispatched!
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Successfully sent event notification to{' '}
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {successResult.sent} of {successResult.total}
                </strong>{' '}
                registered club members.
              </p>
            </div>
            <div className="pt-2">
              <Button variant="primary" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Event Summary Preview */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-sky-400">
                    Event to Announce
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
                    {event.title}
                  </h3>
                </div>
                {event.image_url && (
                  <img
                    src={event.image_url}
                    alt={event.title}
                    className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 truncate">
                  <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">
                    {formatEventDate(event.date)}
                    {event.start_time && (
                      <>
                        <span className="text-slate-300 dark:text-slate-600 font-bold mx-1.5">•</span>
                        <span>{formatEventTime(event.start_time)}</span>
                      </>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">{event.location || 'Chandigarh University'}</span>
                </div>
              </div>
            </div>

            {/* Recipient Audience Stats */}
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Target Recipient Audience
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    All active registered club members in the database
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                {loadingRecipients ? (
                  <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin ml-auto" />
                ) : (
                  <span className="text-sm font-black text-blue-600 dark:text-sky-400">
                    {recipients.length} recipients
                  </span>
                )}
              </div>
            </div>

            {/* Warning Note */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <span>
                This will dispatch an official event announcement email to all {recipients.length} active registered club members. Please verify all event details before confirming.
              </span>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isBroadcasting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleBroadcast}
                disabled={isBroadcasting || loadingRecipients || recipients.length === 0}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer shadow-md shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isBroadcasting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                    <span>Broadcasting ({recipients.length})...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 shrink-0" />
                    <span>Send Announcement ({recipients.length})</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
