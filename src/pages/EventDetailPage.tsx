import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Users,
  ScrollText,
  ChevronRight,
  Maximize2,
  Camera,
  Share2,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import { getEventBySlug } from '../services/events';
import { getGalleryPhotosByEvent } from '../services/gallery';
import { getEventRegistrationCountsMap } from '../services/registrationForms';
import {
  formatEventDate,
  formatEventTime,
  isRegistrationActive,
  isRegistrationFull,
  isFeedbackActive,
} from '../utils/formatters';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import type { Event, GalleryPhoto } from '../types/database';

export const EventDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const outletContext = useOutletContext<{
    onRegisterEventClick?: (evt: Event) => void;
    onFeedbackEventClick?: (evt: Event) => void;
  }>();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [loadingGallery, setLoadingGallery] = useState<boolean>(false);
  const [registrationCounts, setRegistrationCounts] = useState<Record<string, number>>({});
  const [isPosterModalOpen, setIsPosterModalOpen] = useState<boolean>(false);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [regModalDismissed, setRegModalDismissed] = useState(false);
  const [feedbackModalDismissed, setFeedbackModalDismissed] = useState(false);

  const isRegisterRoute =
    location.pathname.endsWith('/register') || location.pathname.endsWith('/registration');
  const isFeedbackRoute = location.pathname.endsWith('/feedback');

  useEffect(() => {
    if (!isRegisterRoute) {
      setRegModalDismissed(false);
    }
  }, [isRegisterRoute]);

  useEffect(() => {
    if (!isFeedbackRoute) {
      setFeedbackModalDismissed(false);
    }
  }, [isFeedbackRoute]);

  // Deep-link modal auto-open based on URL (/register, /registration, /feedback)
  useEffect(() => {
    if (!event || loading) return;

    if (isRegisterRoute && !regModalDismissed && outletContext?.onRegisterEventClick) {
      outletContext.onRegisterEventClick(event);
    } else if (isFeedbackRoute && !feedbackModalDismissed && outletContext?.onFeedbackEventClick) {
      outletContext.onFeedbackEventClick(event);
    }
  }, [event, loading, isRegisterRoute, isFeedbackRoute, regModalDismissed, feedbackModalDismissed, outletContext]);

  useEffect(() => {
    let isMounted = true;
    const fetchEventData = async () => {
      if (!slug) return;
      setLoading(true);
      try {
        const [eventData, countsMap] = await Promise.all([
          getEventBySlug(slug),
          getEventRegistrationCountsMap(),
        ]);

        if (isMounted) {
          setEvent(eventData);
          setRegistrationCounts(countsMap || {});
        }

        if (eventData) {
          // If completed or past, or has photo gallery, fetch photos
          setLoadingGallery(true);
          try {
            const photos = await getGalleryPhotosByEvent(eventData.id);
            if (isMounted) {
              setGalleryPhotos(photos || []);
            }
          } catch (gErr) {
            console.warn('Could not fetch event gallery:', gErr);
          } finally {
            if (isMounted) setLoadingGallery(false);
          }
        }
      } catch (err) {
        console.error('Error fetching event detail:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchEventData();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  const handleShare = () => {
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2500);
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-32 pb-20 px-4 max-w-5xl mx-auto flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Loading Event Details...
        </p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen pt-32 pb-20 px-4 max-w-3xl mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          Event Not Found
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          The event you are looking for does not exist or may have been updated.
        </p>
        <Button
          variant="primary"
          onClick={() => navigate('/events')}
        >
          Back to All Events
        </Button>
      </div>
    );
  }

  const currentCount = registrationCounts[event.id] || 0;
  const isFull = isRegistrationFull(event, currentCount);
  const isRegActive = isRegistrationActive(event, currentCount);
  const isFeedback = isFeedbackActive(event);

  // Format guidelines / rules into list items
  const rulesList = (event.rules || '')
    .split('\n')
    .map((r) => r.trim())
    .filter((r) => r.length > 0);

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto relative z-10 space-y-6">
      {/* Top Breadcrumbs & Back Navigation */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-hidden text-xs font-bold text-slate-600 dark:text-slate-400">
          <button
            onClick={() => navigate('/')}
            className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors cursor-pointer shrink-0"
          >
            Home
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <button
            onClick={() => navigate('/events')}
            className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors cursor-pointer shrink-0"
          >
            Events
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-blue-600 dark:text-sky-400 truncate">{event.title}</span>
        </div>

        <button
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-sky-400 transition-colors cursor-pointer shrink-0"
          title="Share Event Link"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{copiedUrl ? 'Copied Link! ✓' : 'Share'}</span>
        </button>
      </div>

      {/* Card 1: Top Hero Box (Poster on Left + Title, Details & CTA on Right) */}
      <div className="neumorphic-card p-6 sm:p-8 rounded-3xl relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
          {/* Left Column: Event Poster */}
          <div className="md:col-span-5 lg:col-span-5 flex justify-center items-center">
            {event.image_url ? (
              <div className="relative inline-block group transition-transform duration-300 hover:-translate-y-1.5 cursor-pointer">
                <img
                  src={event.image_url}
                  alt={event.title}
                  className="w-auto h-auto max-w-full max-h-[440px] rounded-2xl block shadow-lg group-hover:shadow-2xl group-hover:shadow-slate-900/35 dark:group-hover:shadow-black/70 transition-shadow duration-300 object-contain"
                  onClick={() => setIsPosterModalOpen(true)}
                />
                <button
                  type="button"
                  onClick={() => setIsPosterModalOpen(true)}
                  className="absolute bottom-3 right-3 p-2 rounded-xl bg-black/70 hover:bg-black/90 text-white backdrop-blur-md transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold border border-white/20 shadow-md opacity-90 group-hover:opacity-100"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>View Poster</span>
                </button>
              </div>
            ) : (
              <div className="w-full h-64 rounded-2xl bg-gradient-to-br from-blue-900/30 to-slate-950 border border-slate-200/80 dark:border-slate-800/80 flex flex-col items-center justify-center p-6 text-center max-w-[300px]">
                <Sparkles className="w-8 h-8 text-blue-400/60 mb-2" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Cloud Stack Club
                </span>
              </div>
            )}
          </div>

          {/* Right Column: Status, Event Type, Title, Date, Time, Venue, Capacity, CTA */}
          <div className="md:col-span-7 lg:col-span-7 flex flex-col justify-between space-y-5">
            {/* Status & Event Type Pills */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                {event.status === 'live' ? (
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Ongoing Event
                  </span>
                ) : event.status === 'upcoming' ? (
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-500/15 text-blue-600 dark:text-sky-400 border border-blue-500/30 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Upcoming Event
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30">
                    Completed Event
                  </span>
                )}

                {event.category && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-200/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                    {event.category}
                  </span>
                )}
              </div>

              {/* Event Title */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                {event.title}
              </h1>
            </div>

            {/* Logistics Grid Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Date */}
              <div className="p-3 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-white/60 dark:border-slate-700/60 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-sky-400 shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {formatEventDate(event.date)}
                  </p>
                </div>
              </div>

              {/* Time */}
              {event.start_time && (
                <div className="p-3 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-white/60 dark:border-slate-700/60 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-sky-400 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Time</p>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                      {formatEventTime(event.start_time)}
                    </p>
                  </div>
                </div>
              )}

              {/* Venue */}
              <div className="p-3 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-white/60 dark:border-slate-700/60 flex items-center gap-3 sm:col-span-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-sky-400 shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Venue</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {event.location || 'Chandigarh University'}
                  </p>
                </div>
              </div>

              {/* Format */}
              <div className="p-3 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-white/60 dark:border-slate-700/60 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-sky-400 shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Format</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {event.supports_teams ? `Team (${event.max_team_size || 4})` : 'Individual'}
                  </p>
                </div>
              </div>

              {/* Capacity */}
              {event.max_registrations !== null && event.max_registrations !== undefined ? (
                <div className="p-3 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-white/60 dark:border-slate-700/60 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Capacity</p>
                    <p className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 truncate">
                      {currentCount} / {event.max_registrations}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            {/* CTA Button */}
            <div className="pt-2">
              {isFeedback ? (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    setFeedbackModalDismissed(false);
                    navigate(`/events/${slug}/feedback`);
                    outletContext?.onFeedbackEventClick?.(event);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25"
                >
                  Give Event Feedback
                </Button>
              ) : event.status === 'upcoming' ? (
                isFull ? (
                  <button
                    disabled
                    className="w-full py-3.5 px-4 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-400 text-xs font-black uppercase tracking-wider cursor-not-allowed text-center"
                  >
                    Registration Full • Capacity Reached
                  </button>
                ) : isRegActive ? (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => {
                      setRegModalDismissed(false);
                      navigate(`/events/${slug}/register`);
                      outletContext?.onRegisterEventClick?.(event);
                    }}
                    className="w-full shadow-xl shadow-blue-500/25 text-sm font-bold"
                  >
                    Register Now
                  </Button>
                ) : (
                  <button
                    disabled
                    className="w-full py-3.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider cursor-not-allowed text-center"
                  >
                    Registration Closed
                  </button>
                )
              ) : (
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-center">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    This event has concluded. Check out the event highlights below!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: About the Event */}
      <div className="neumorphic-card p-6 sm:p-8 rounded-3xl relative overflow-hidden space-y-3">
        <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
          About the Event
        </h2>
        <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-medium">
          {event.description ||
            'Join us for this exciting Cloud Stack Club session designed to provide hands-on experience and real-world skills.'}
        </p>
      </div>

      {/* Card 3: Rules & Participation Guidelines (if applicable) */}
      {rulesList.length > 0 && (
        <div className="neumorphic-card p-6 sm:p-8 rounded-3xl relative overflow-hidden space-y-4">
          <div className="flex items-center gap-2.5 text-blue-600 dark:text-sky-400">
            <ScrollText className="w-5 h-5 shrink-0" />
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Rules & Participation Guidelines
            </h2>
          </div>

          <div className="space-y-2.5">
            {rulesList.map((rule, idx) => {
              const cleanRule = rule.replace(/^[•\-\*]\s*/, '');
              return (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-white/60 dark:border-slate-700/60 text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium"
                >
                  <span className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-600 dark:text-sky-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="leading-relaxed flex-1">{cleanRule}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Card 4: Event Photo Highlights (with Arrow button to open main gallery) */}
      {(loadingGallery || galleryPhotos.length > 0) && (
        <div className="neumorphic-card p-6 sm:p-8 rounded-3xl relative overflow-hidden space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/gallery')}
              className="group flex items-center gap-2 text-lg sm:text-xl font-black text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-sky-400 transition-colors cursor-pointer text-left"
              title="Open main club gallery"
            >
              <Camera className="w-5 h-5 text-blue-600 dark:text-sky-400 shrink-0" />
              <div className="flex items-center gap-0.5">
                <span>Event Photo Highlights</span>
                <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-sky-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
              </div>
            </button>

            {galleryPhotos.length > 0 && (
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {galleryPhotos.length} {galleryPhotos.length === 1 ? 'photo' : 'photos'}
              </span>
            )}
          </div>

          {loadingGallery ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {galleryPhotos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  className="relative h-36 sm:h-44 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800 group cursor-pointer"
                >
                  <img
                    src={photo.image_url}
                    alt={photo.caption || event.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                    {photo.caption && (
                      <span className="text-[11px] font-bold text-white line-clamp-1">
                        {photo.caption}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Poster Zoom Modal */}
      {event.image_url && (
        <Modal
          isOpen={isPosterModalOpen}
          onClose={() => setIsPosterModalOpen(false)}
          title={`Poster — ${event.title}`}
        >
          <div className="flex justify-center p-2">
            <img
              src={event.image_url}
              alt={event.title}
              className="max-h-[80vh] w-auto rounded-2xl object-contain"
            />
          </div>
        </Modal>
      )}

      {/* Photo Lightbox Modal */}
      {selectedPhoto && (
        <Modal
          isOpen={!!selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          title={selectedPhoto.caption || 'Event Highlight'}
        >
          <div className="flex flex-col items-center justify-center p-2 space-y-3">
            <img
              src={selectedPhoto.image_url}
              alt={selectedPhoto.caption || 'Event Highlight'}
              className="max-h-[75vh] w-auto rounded-2xl object-contain"
            />
            {selectedPhoto.caption && (
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300 text-center">
                {selectedPhoto.caption}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
