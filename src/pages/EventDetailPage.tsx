import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Users,
  ScrollText,
  ArrowLeft,
  ChevronRight,
  Maximize2,
  Camera,
  Share2,
  AlertTriangle,
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
      <div className="min-h-screen pt-32 pb-20 px-4 max-w-7xl mx-auto flex flex-col items-center justify-center space-y-4">
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
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to All Events
        </Button>
      </div>
    );
  }

  const currentCount = registrationCounts[event.id] || 0;
  const isFull = isRegistrationFull(event, currentCount);
  const remainingSeats =
    event.max_registrations !== null && event.max_registrations !== undefined
      ? Math.max(0, event.max_registrations - currentCount)
      : null;
  const isRegActive = isRegistrationActive(event, currentCount);
  const isFeedback = isFeedbackActive(event);

  // Format guidelines / rules into list items
  const rulesList = (event.rules || '')
    .split('\n')
    .map((r) => r.trim())
    .filter((r) => r.length > 0);

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
      {/* Top Breadcrumbs & Back Navigation */}
      <div className="mb-6 flex items-center justify-between gap-4">
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

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Left Column: Poster, Description, Rules, and Completed Event Photo Gallery */}
        <div className="lg:col-span-8 space-y-8">
          {/* Header Title & Badges */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Event Status Badge */}
              {event.status === 'live' ? (
                <span className="px-3.5 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-2 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Ongoing Event
                </span>
              ) : event.status === 'upcoming' ? (
                <span className="px-3.5 py-1 rounded-full text-xs font-extrabold bg-blue-500/15 text-blue-600 dark:text-sky-400 border border-blue-500/30 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Upcoming Event
                </span>
              ) : (
                <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30">
                  Completed Event
                </span>
              )}

              {/* Event Category Badge */}
              {event.category && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-200/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                  {event.category}
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {event.title}
            </h1>
          </div>

          {/* Event Poster Card */}
          {event.image_url ? (
            <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 group shadow-lg">
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full h-auto max-h-[500px] object-cover cursor-pointer transition-transform duration-500 group-hover:scale-[1.01]"
                onClick={() => setIsPosterModalOpen(true)}
              />
              <button
                type="button"
                onClick={() => setIsPosterModalOpen(true)}
                className="absolute bottom-4 right-4 p-2.5 rounded-2xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold border border-white/20"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>View Poster</span>
              </button>
            </div>
          ) : null}

          {/* About / Description Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-sm space-y-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>About the Event</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-medium">
              {event.description ||
                'Join us for this exciting Cloud Stack Club session designed to provide hands-on experience and real-world skills.'}
            </p>
          </div>

          {/* Event Rules & Guidelines Section */}
          {rulesList.length > 0 && (
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-blue-50/50 via-white/80 to-blue-50/20 dark:from-slate-900/90 dark:via-slate-900/80 dark:to-slate-950 border border-blue-200/60 dark:border-slate-800 space-y-5">
              <div className="flex items-center gap-2.5 text-blue-600 dark:text-sky-400">
                <ScrollText className="w-5 h-5 shrink-0" />
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Rules & Participation Guidelines
                </h2>
              </div>

              <div className="space-y-2.5">
                {rulesList.map((rule, idx) => {
                  const cleanRule = rule.replace(/^[•\-\*]\s*/, '');
                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium"
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

          {/* Completed Event Photo Gallery Section */}
          {(event.status === 'completed' || galleryPhotos.length > 0) && (
            <div className="p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-sm space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Camera className="w-5 h-5 text-blue-600 dark:text-sky-400" />
                  <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    Event Photo Highlights
                  </h2>
                </div>
                {galleryPhotos.length > 0 && (
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {galleryPhotos.length} {galleryPhotos.length === 1 ? 'photo' : 'photos'}
                  </span>
                )}
              </div>

              {loadingGallery ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse"
                    />
                  ))}
                </div>
              ) : galleryPhotos.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Event photos will be uploaded here shortly following the session.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
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
        </div>

        {/* Right Column: Sticky Event Logistics & Registration Actions */}
        <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-6">
          <div className="p-6 sm:p-7 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md shadow-xl shadow-blue-500/5 space-y-6">
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight uppercase tracking-wider text-xs text-blue-600 dark:text-sky-400">
              Event Details & Logistics
            </h3>

            {/* Logistics Grid */}
            <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium">
              {/* Date */}
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-sky-400 shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Date
                  </p>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {formatEventDate(event.date)}
                  </p>
                </div>
              </div>

              {/* Time */}
              {event.start_time && (
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-sky-400 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Time
                    </p>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {formatEventTime(event.start_time)}
                    </p>
                  </div>
                </div>
              )}

              {/* Venue */}
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-sky-400 shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Venue / Location
                  </p>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {event.location || 'Chandigarh University'}
                  </p>
                </div>
              </div>

              {/* Team Participation */}
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-sky-400 shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Participation Type
                  </p>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {event.supports_teams
                      ? `Team Event (Up to ${event.max_team_size || 4} members)`
                      : 'Individual Participation'}
                  </p>
                </div>
              </div>

              {/* Seat Capacity Status */}
              {event.status === 'upcoming' && remainingSeats !== null && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Available Capacity
                  </p>
                  {isFull ? (
                    <p className="text-xs font-black text-red-600 dark:text-red-400">
                      🎟️ Registration Full • Capacity Reached
                    </p>
                  ) : (
                    <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                      🎟️ {remainingSeats} seats available out of {event.max_registrations}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Action CTA Buttons */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              {/* Ongoing Event Feedback CTA */}
              {isFeedback && (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => outletContext?.onFeedbackEventClick?.(event)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25"
                >
                  Give Event Feedback
                </Button>
              )}

              {/* Upcoming Event Registration CTA */}
              {event.status === 'upcoming' && (
                <>
                  {isFull ? (
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
                      onClick={() => outletContext?.onRegisterEventClick?.(event)}
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
                  )}
                </>
              )}

              {/* Completed Event Status */}
              {event.status === 'completed' && !isFeedback && (
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-center">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    This event has concluded. Check out the highlights above!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
