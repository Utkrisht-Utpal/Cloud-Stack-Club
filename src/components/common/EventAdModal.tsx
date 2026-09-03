import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, MapPin, Sparkles, ArrowRight, FileText, Users2, Ticket, Timer, MessageSquare } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { formatEventTime, getEventStatusInfo, isRegistrationActive, isRegistrationFull } from '../../utils/formatters';
import { getEventRegistrationCountsMap } from '../../services/registrationForms';
import type { Event } from '../../types/database';

interface EventAdModalProps {
  events: Event[];
  onRegisterClick?: (event: Event) => void;
  onViewPdfClick?: (pdfUrl: string, title: string) => void;
  onFeedbackClick?: (event: Event) => void;
}

/**
 * Calculates day difference between event date and today (midnight-aligned)
 *  0 = Today (Event Day T)
 * -1 = Yesterday (Day T+1 relative to event)
 * < -1 = Older past event (Day T+2 onwards)
 * > 0 = Future / Upcoming event
 */
const getDiffDays = (dateStr?: string | null): number | null => {
  if (!dateStr) return null;
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length < 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const eventMidnight = new Date(y, m - 1, d).getTime();
  return Math.round((eventMidnight - todayMidnight) / (24 * 60 * 60 * 1000));
};

export const EventAdModal: React.FC<EventAdModalProps> = ({
  events,
  onRegisterClick,
  onViewPdfClick,
  onFeedbackClick,
}) => {
  const location = useLocation();
  const [activeAdEvent, setActiveAdEvent] = useState<Event | null>(null);
  const [isFeedbackWindow, setIsFeedbackWindow] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [regCountsMap, setRegCountsMap] = useState<Record<string, number>>({});
  const { isAdminLoggedIn } = useAdminAuth();
  const userDismissedRef = useRef(false);

  // The ad pop up should only come when visiting the Home page or sections of that (e.g. /about, /domains, /contact)
  const isHomeOrSection =
    location.pathname === '/' ||
    location.pathname === '/about' ||
    location.pathname === '/domains' ||
    location.pathname === '/contact';

  // Load real-time registration counts map (zero student PII)
  useEffect(() => {
    getEventRegistrationCountsMap()
      .then((counts) => setRegCountsMap(counts))
      .catch(() => {});
  }, [events]);

  useEffect(() => {
    if (!isHomeOrSection) {
      setIsOpen(false);
      return;
    }
    if (!events || events.length === 0) return;
    if (userDismissedRef.current) return;

    // 1. Priority 1: Check for event in the T + 1 Feedback Window (Day T: 0, Day T+1: -1)
    const feedbackCandidates = events
      .filter((evt) => {
        if (evt.status === ('cancelled' as any) || evt.status === ('inactive' as any)) return false;
        const diff = getDiffDays(evt.date);
        return diff === 0 || diff === -1;
      })
      .sort((a, b) => {
        const diffA = getDiffDays(a.date) ?? -999;
        const diffB = getDiffDays(b.date) ?? -999;
        // Prioritize ongoing event today (0) over yesterday (-1)
        return diffB - diffA;
      });

    if (feedbackCandidates.length > 0) {
      setActiveAdEvent(feedbackCandidates[0]);
      setIsFeedbackWindow(true);
      setIsOpen(true);
      return;
    }

    // 2. Priority 2: Nearest Upcoming Event (Day T+2 onwards or future)
    const upcomingCandidates = events
      .filter((evt) => {
        if (
          evt.status === ('cancelled' as any) ||
          evt.status === ('inactive' as any) ||
          evt.status === ('completed' as any)
        ) {
          return false;
        }
        const diff = getDiffDays(evt.date);
        return diff !== null && diff > 0;
      })
      .sort((a, b) => {
        const diffA = getDiffDays(a.date) ?? 999;
        const diffB = getDiffDays(b.date) ?? 999;
        return diffA - diffB;
      });

    if (upcomingCandidates.length > 0) {
      setActiveAdEvent(upcomingCandidates[0]);
      setIsFeedbackWindow(false);
      setIsOpen(true);
      return;
    }

    // 3. Fallback: No matching event
    setActiveAdEvent(null);
    setIsFeedbackWindow(false);
    setIsOpen(false);
  }, [events, isHomeOrSection]);

  useEffect(() => {
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

  useEffect(() => {
    const handleCloseAll = () => {
      if (isOpen) setIsOpen(false);
    };
    window.addEventListener('close-all-modals', handleCloseAll);
    return () => window.removeEventListener('close-all-modals', handleCloseAll);
  }, [isOpen]);

  const handleClose = () => {
    userDismissedRef.current = true;
    setIsOpen(false);
  };

  if (!isHomeOrSection || !activeAdEvent || !isOpen) return null;

  const diffDays = getDiffDays(activeAdEvent.date);
  const isFeedbackActive = isFeedbackWindow || diffDays === 0 || diffDays === -1 || activeAdEvent.status === 'live';

  const eventDateFormatted = activeAdEvent.date
    ? new Date(activeAdEvent.date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    : 'Date TBD';

  const regStartFormatted = activeAdEvent.registration_start
    ? new Date(activeAdEvent.registration_start).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    : null;

  const regEndFormatted = activeAdEvent.registration_end
    ? new Date(activeAdEvent.registration_end).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    : null;

  const regCount = activeAdEvent ? (regCountsMap[activeAdEvent.id.toLowerCase()] ?? 0) : 0;
  const isCapacityFull = isRegistrationFull(activeAdEvent, regCount);
  const regOpen = isRegistrationActive(activeAdEvent, regCount);
  const statusInfo = getEventStatusInfo(activeAdEvent.date);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-950/85 backdrop-blur-md overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col scrollbar-none"
        >
          {/* Top-Right Dismiss Cross Button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 p-2.5 rounded-full bg-slate-950/80 hover:bg-slate-950 text-white backdrop-blur-md transition-all transform hover:scale-110 shadow-2xl cursor-pointer border border-white/20"
            aria-label="Close Announcement"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 overflow-y-auto">
            {/* Left Column: Event Poster (45% on Large screens) */}
            <div className="lg:col-span-5 relative bg-slate-950 flex items-center justify-center p-4 sm:p-6 overflow-hidden min-h-[220px] sm:min-h-[300px]">
              {activeAdEvent.image_url ? (
                <img
                  src={activeAdEvent.image_url}
                  alt={activeAdEvent.title}
                  className="w-full h-full object-contain max-h-[280px] sm:max-h-[380px] lg:max-h-[460px] rounded-2xl shadow-2xl transition-transform duration-500 hover:scale-[1.02]"
                />
              ) : (
                <div className="text-center p-8 space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center mx-auto shadow-inner">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <p className="text-xs font-semibold text-slate-400">Featured Club Event</p>
                </div>
              )}
            </div>

            {/* Right Column: Key Details & Actions (55% on Large screens) */}
            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-5 bg-white dark:bg-slate-900">
              <div className="space-y-4">
                {/* Status Badges Header */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Event Status Pill (First) */}
                  {statusInfo.type === 'ongoing' || diffDays === 0 ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider border bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 shadow-sm animate-pulse">
                      <Sparkles className="w-3.5 h-3.5 text-current" />
                      <span>ONGOING EVENT</span>
                    </div>
                  ) : isFeedbackActive && diffDays === -1 ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider border bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 shadow-sm">
                      <Sparkles className="w-3.5 h-3.5 text-current" />
                      <span>RECENT EVENT • FEEDBACK OPEN</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider border bg-blue-500/15 text-blue-600 dark:text-sky-400 border-blue-500/30 shadow-sm">
                      <Sparkles className="w-3.5 h-3.5 text-current" />
                      <span>{statusInfo.label.toUpperCase()}</span>
                    </div>
                  )}

                  {/* Event Type / Category Pill (Second) */}
                  {activeAdEvent.category && activeAdEvent.category.trim() && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {activeAdEvent.category}
                    </span>
                  )}

                  {/* Registration Indicator (Upcoming events only) */}
                  {activeAdEvent.registration_enabled && !isFeedbackActive && (
                    regOpen ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-pulse">
                        ● Registration Open
                      </span>
                    ) : isCapacityFull ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        ● Capacity Full
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                        ● Registration Closed
                      </span>
                    )
                  )}
                </div>

                {/* Event Title */}
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  {activeAdEvent.title}
                </h2>

                {/* Event Description */}
                {activeAdEvent.description && (
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-h-32 overflow-y-auto pr-1">
                    {activeAdEvent.description}
                  </p>
                )}

                {/* Meta Details Pill Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-7 h-7 rounded-xl bg-blue-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Date</div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {eventDateFormatted}
                      </div>
                    </div>
                  </div>

                  {activeAdEvent.start_time && (
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-7 h-7 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Time</div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {formatEventTime(activeAdEvent.start_time)}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Venue</div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {activeAdEvent.location || 'CU Venue'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Details Badges (Only shown for upcoming / registration-active events, hidden when ongoing or in feedback window) */}
                {!isFeedbackActive && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {activeAdEvent.supports_teams && (
                      <span className="px-2.5 py-1 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center gap-1.5">
                        <Users2 className="w-3.5 h-3.5" />
                        <span>Teams (Max {activeAdEvent.max_team_size || 4} members)</span>
                      </span>
                    )}

                    {activeAdEvent.max_registrations && (
                      isCapacityFull ? (
                        <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center gap-1.5 border border-amber-500/30">
                          <Ticket className="w-3.5 h-3.5" />
                          <span>Capacity Full ({activeAdEvent.max_registrations} seats filled)</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-1.5">
                          <Ticket className="w-3.5 h-3.5" />
                          <span>{Math.max(0, activeAdEvent.max_registrations - regCount)} seats available</span>
                        </span>
                      )
                    )}

                    {activeAdEvent.registration_enabled && regStartFormatted && (
                      <span className="px-2.5 py-1 rounded-xl bg-blue-500/15 text-blue-600 dark:text-sky-400 text-[11px] font-semibold flex items-center gap-1.5">
                        <Timer className="w-3.5 h-3.5" />
                        <span>Registration Starts: {regStartFormatted}</span>
                      </span>
                    )}

                    {activeAdEvent.registration_enabled && regEndFormatted && (
                      <span className="px-2.5 py-1 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[11px] font-semibold flex items-center gap-1.5">
                        <Timer className="w-3.5 h-3.5" />
                        <span>Registration Ends: {regEndFormatted}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-3">
                {isFeedbackActive && onFeedbackClick && (
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onFeedbackClick(activeAdEvent);
                    }}
                    className={`w-full sm:flex-1 py-3 px-6 rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      activeAdEvent.registration_enabled && regOpen
                        ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-300/80 dark:border-slate-700 shadow-sm'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Give Event Feedback</span>
                  </button>
                )}

                {activeAdEvent.registration_enabled && (!isFeedbackActive || regOpen) && (
                  regOpen && onRegisterClick ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        onRegisterClick(activeAdEvent);
                      }}
                      className="w-full sm:flex-1 py-3 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-extrabold transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <span>Register Now for Event</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : isCapacityFull ? (
                    <div className="w-full sm:flex-1 py-3 px-6 rounded-2xl bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 select-none shadow-sm">
                      <Ticket className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Registration Full • Capacity Reached</span>
                    </div>
                  ) : (
                    !isFeedbackActive && (
                      <div className="w-full sm:flex-1 py-3 px-6 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700 select-none">
                        <span>Registration Closed</span>
                      </div>
                    )
                  )
                )}

                {isAdminLoggedIn && activeAdEvent.pdf_url && onViewPdfClick && (
                  <button
                    type="button"
                    onClick={() => {
                      onViewPdfClick(activeAdEvent.pdf_url!, activeAdEvent.title);
                    }}
                    className="w-full sm:w-auto py-3 px-5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span>View Event PDF</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
