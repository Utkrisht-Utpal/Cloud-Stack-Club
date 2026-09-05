import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Camera,
  Calendar,
  MapPin,
  Tag,
  Search,
  Image as ImageIcon,
  FolderOpen,
  ArrowUpRight,
} from 'lucide-react';
import { getGalleryGroupedByEvent } from '../../services/gallery';
import { GalleryLightbox } from './GalleryLightbox';
import { JustifiedGallery } from './JustifiedGallery';
import type { EventWithGallery, GalleryPhoto } from '../../types/database';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';

// Format YYYY-MM-DD to DD-MM-YYYY
const formatToDDMMYYYY = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
  }
  return dateStr;
};

export const GallerySection: React.FC = () => {
  const [eventsWithGallery, setEventsWithGallery] = useState<EventWithGallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('all');

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activePhotoList, setActivePhotoList] = useState<GalleryPhoto[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const navigate = useNavigate();

  const fetchGallery = async () => {
    setLoading(true);
    try {
      const data = await getGalleryGroupedByEvent();
      setEventsWithGallery(data);
    } catch (err) {
      console.error('Failed to load gallery:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, []);

  // Filtered events based on search and event category/tab filter
  const filteredEvents = useMemo(() => {
    return eventsWithGallery
      .filter((eventItem) => {
        // Tab category filter
        if (selectedEventFilter !== 'all') {
          const cat = (eventItem.category || '').toLowerCase();
          const filter = selectedEventFilter.toLowerCase();
          if (!cat.includes(filter) && filter !== eventItem.id) {
            return false;
          }
        }

        // Search query filter (event title, description, or photo captions)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = eventItem.title.toLowerCase().includes(q);
          const matchDesc = (eventItem.description || '').toLowerCase().includes(q);
          const matchPhotos = eventItem.photos.some((p) =>
            (p.caption || '').toLowerCase().includes(q)
          );
          return matchTitle || matchDesc || matchPhotos;
        }

        return true;
      })
      .map((eventItem) => {
        // If there's a search query, optionally filter the displayed photos inside the event
        if (!searchQuery.trim()) return eventItem;
        const q = searchQuery.toLowerCase();
        const matchedPhotos = eventItem.photos.filter(
          (p) =>
            (p.caption || '').toLowerCase().includes(q) ||
            eventItem.title.toLowerCase().includes(q)
        );
        return {
          ...eventItem,
          photos: matchedPhotos.length > 0 ? matchedPhotos : eventItem.photos,
        };
      });
  }, [eventsWithGallery, selectedEventFilter, searchQuery]);

  // Unique categories for filter tabs
  const categories = useMemo(() => {
    const set = new Set<string>();
    eventsWithGallery.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set);
  }, [eventsWithGallery]);

  const openLightbox = (photos: GalleryPhoto[], index: number) => {
    setActivePhotoList(photos);
    setActivePhotoIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-sky-500/10 dark:bg-sky-500/15 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-12 space-y-8">
        {/* Header Banner */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-sky-400 text-xs font-bold uppercase tracking-wider"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Cloud Stack Club Moments</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white"
          >
            Event Photo <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-400">Gallery</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium"
          >
            Capturing the excitement, creativity, and community behind our hackathons, tech workshops, bootcamps, and industrial visits.
          </motion.p>
        </div>

        {/* Filter Controls: Search & Category Tabs */}
        <div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1.5 sm:pb-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => setSelectedEventFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedEventFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                All Events
              </button>

              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedEventFilter(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap uppercase tracking-wider transition-all cursor-pointer ${
                    selectedEventFilter === cat
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search event photos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-0 focus:border-slate-300 dark:focus:border-slate-700 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Gallery Content Area */}
        {loading ? (
          /* Skeleton Loader */
          <div className="space-y-8">
            {[1, 2].map((n) => (
              <div key={n} className="p-5 sm:p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-4 animate-pulse">
                <div className="h-16 rounded-2xl bg-slate-200 dark:bg-slate-800/80" />
                <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-3.5 space-y-3.5">
                  {[1, 2, 3, 4].map((m) => (
                    <div key={m} className="break-inside-avoid h-52 rounded-2xl bg-slate-200 dark:bg-slate-800/60" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          /* Empty State */
          <div className="py-14 px-6 text-center rounded-3xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 backdrop-blur-xl max-w-xl mx-auto space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600/20 to-sky-400/20 text-blue-600 dark:text-sky-400 flex items-center justify-center mx-auto shadow-inner">
              <FolderOpen className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {eventsWithGallery.length === 0 ? 'Gallery Coming Soon' : 'No Matching Photos Found'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto">
                {eventsWithGallery.length === 0
                  ? 'Photos from our upcoming hackathons, tech bootcamps, and workshops will be published here directly after each event.'
                  : 'Try adjusting your search query or switching the event filter tab above.'}
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<ArrowUpRight className="w-4 h-4" />}
              onClick={() => navigate('/#events')}
            >
              Explore Upcoming Events
            </Button>
          </div>
        ) : (
          /* Event-Wise Grouped Showcase with Google Photos / Masonry Layout */
          <div className="space-y-8">
            {filteredEvents.map((eventItem, eventIndex) => (
              <motion.section
                key={eventItem.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: eventIndex * 0.08 }}
                className="p-4 sm:p-6 lg:p-7 rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 shadow-md space-y-5 relative overflow-hidden [content-visibility:auto] [contain-intrinsic-size:400px]"
              >
                {/* Ambient Light Glow */}
                <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-3xl pointer-events-none" />

                {/* Event Details Header inside the card */}
                <div className="relative z-10 space-y-2 pb-3.5 border-b border-slate-100 dark:border-slate-800/80">
                  {/* Category & Date Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    {eventItem.category && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-600 dark:text-sky-400 border border-blue-500/20 flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {eventItem.category}
                      </span>
                    )}

                    {eventItem.date && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-blue-500" />
                        {formatToDDMMYYYY(eventItem.date)}
                      </span>
                    )}

                    {eventItem.location && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-500" />
                        {eventItem.location}
                      </span>
                    )}

                    <span className="ml-auto px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3 text-blue-500" />
                      {eventItem.photos.length} {eventItem.photos.length === 1 ? 'Photo' : 'Photos'}
                    </span>
                  </div>

                  {/* Event Title */}
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                    {eventItem.title}
                  </h2>

                  {/* Description: ONLY rendered if present */}
                  {eventItem.description && eventItem.description.trim() && (
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-4xl">
                      {eventItem.description}
                    </p>
                  )}
                </div>

                {/* Google Photos Style Responsive Justified Layout */}
                <JustifiedGallery
                  photos={eventItem.photos}
                  eventTitle={eventItem.title}
                  onPhotoClick={(photoIndex) => openLightbox(eventItem.photos, photoIndex)}
                />
              </motion.section>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      <GalleryLightbox
        isOpen={lightboxOpen}
        photos={activePhotoList}
        currentIndex={activePhotoIndex}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(newIndex) => setActivePhotoIndex(newIndex)}
      />
    </div>
  );
};
