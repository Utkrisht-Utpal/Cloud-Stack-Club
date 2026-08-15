import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, MapPin, Sparkles, ArrowRight, FileText, Users2, Ticket, Timer } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { formatEventTime, getEventStatusInfo, isRegistrationActive } from '../../utils/formatters';
import type { Event } from '../../types/database';

interface EventAdModalProps {
  events: Event[];
  onRegisterClick?: (event: Event) => void;
  onViewPdfClick?: (pdfUrl: string, title: string) => void;
}

export const EventAdModal: React.FC<EventAdModalProps> = ({
  events,
  onRegisterClick,
  onViewPdfClick,
}) => {
  const [activeAdEvent, setActiveAdEvent] = useState<Event | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { isAdminLoggedIn } = useAdminAuth();
  const hasTriggeredRef = useRef(false);
  const userDismissedRef = useRef(false);

  useEffect(() => {
    if (!events || events.length === 0) return;
    if (userDismissedRef.current) return;

    const now = new Date();

    // Find the latest active upcoming event whose deadline or date is not over
    const validUpcomingEvent = events.find((evt) => {
      // Exclude deleted, cancelled, or completed events
      if (evt.status === ('cancelled' as any) || evt.status === ('inactive' as any) || evt.status === ('completed' as any)) return false;

      // Check registration end deadline if set
      if (evt.registration_end) {
        const endDate = new Date(evt.registration_end);
        endDate.setHours(23, 59, 59, 999);
        if (endDate < now) return false;
      } else if (evt.date) {
        // Fallback check event date
        const eventDate = new Date(evt.date);
        eventDate.setHours(23, 59, 59, 999);
        if (eventDate < now) return false;
      }

      return true;
    });

    if (validUpcomingEvent) {
      setActiveAdEvent(validUpcomingEvent);

      if (!hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        // Wait 300ms so fresh database event data is fully loaded, eliminating any previous event flash
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 150);
        return () => clearTimeout(timer);
      }
    } else {
      if (isOpen) {
        setIsOpen(false);
      }
    }
  }, [events]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleClose = () => {
    userDismissedRef.current = true;
    setIsOpen(false);
  };

  if (!activeAdEvent || !isOpen) return null;

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

  const statusInfo = getEventStatusInfo(activeAdEvent.date);
  const regOpen = isRegistrationActive(activeAdEvent);

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
            aria-label="Close Announcement Ad"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Split 2-Column Desktop Layout / Stacked Mobile Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 h-full overflow-hidden scrollbar-none">
            {/* Column 1: Full-Size Instagram Poster (5 cols on Desktop) */}
            <div className="md:col-span-5 bg-slate-950 p-3 sm:p-4 flex flex-col items-center justify-center relative overflow-hidden shrink-0 border-b md:border-b-0 md:border-r border-slate-800">

              {activeAdEvent.image_url ? (
                <div className="w-full h-48 sm:h-64 md:h-[420px] max-h-[50vh] md:max-h-[70vh] rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center">
                  <img
                    src={activeAdEvent.image_url}
                    alt={activeAdEvent.title}
                    className="w-full h-full object-contain bg-slate-950 rounded-xl"
                  />
                </div>
              ) : (
                <div className="w-full h-44 sm:h-56 md:h-full rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center p-6 text-center text-white font-bold">
                  <Sparkles className="w-12 h-12 opacity-50" />
                </div>
              )}
            </div>

            {/* Column 2: Event Details & Badges (7 cols on Desktop) */}
            <div className="md:col-span-7 p-5 sm:p-7 md:p-8 flex flex-col justify-between space-y-4 overflow-y-auto scrollbar-none">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusInfo.type === 'ongoing'
                        ? 'bg-blue-600 text-white border-blue-400 shadow-sm animate-pulse'
                        : statusInfo.type === 'completed'
                          ? 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/40'
                          : 'bg-blue-500/15 text-blue-600 dark:text-sky-400 border-blue-500/20'
                        }`}
                    >
                      <Sparkles className="w-3 h-3 text-current" />
                      <span>{statusInfo.type === 'ongoing' ? 'ONGOING EVENT' : statusInfo.label}</span>
                    </div>

                    {activeAdEvent.category && activeAdEvent.category.trim() && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {activeAdEvent.category}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {activeAdEvent.title}
                  </h2>
                  {activeAdEvent.description && (
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed line-clamp-3">
                      {activeAdEvent.description}
                    </p>
                  )}
                </div>

                {/* Event Schedule Meta Grid (Date, Time, Venue) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-blue-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] uppercase font-bold text-slate-400">Date</div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {eventDateFormatted}
                      </div>
                    </div>
                  </div>

                  {activeAdEvent.start_time && (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[9px] uppercase font-bold text-slate-400">Time</div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {formatEventTime(activeAdEvent.start_time)}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] uppercase font-bold text-slate-400">Venue</div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {activeAdEvent.location || 'CU Venue'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Details Badges: Reg Window, Teams, Max Seats */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {activeAdEvent.supports_teams && (
                    <span className="px-2.5 py-1 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center gap-1.5">
                      <Users2 className="w-3.5 h-3.5" />
                      <span>Teams (Max {activeAdEvent.max_team_size || 4} members)</span>
                    </span>
                  )}

                  {activeAdEvent.max_registrations && (
                    <span className="px-2.5 py-1 rounded-xl bg-blue-500/15 text-blue-600 dark:text-sky-400 text-xs font-bold flex items-center gap-1.5">
                      <Ticket className="w-3.5 h-3.5" />
                      <span>Max {activeAdEvent.max_registrations} seats available</span>
                    </span>
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
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-3">
                {activeAdEvent.registration_enabled && (
                  regOpen && onRegisterClick ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        onRegisterClick(activeAdEvent);
                      }}
                      className="w-full sm:flex-1 py-3 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-extrabold transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Register Now for Event</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="w-full sm:flex-1 py-3 px-6 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 cursor-not-allowed border border-slate-300 dark:border-slate-700"
                    >
                      <span>Registration Closed</span>
                    </button>
                  )
                )}

                {/* View Event PDF — Restrict EXCLUSIVELY to Logged-In Admins */}
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
