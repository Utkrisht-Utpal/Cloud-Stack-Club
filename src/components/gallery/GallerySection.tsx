import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Camera,
  Calendar,
  MapPin,
  Tag,
  Search,
  Maximize2,
  Image as ImageIcon,
  FolderOpen,
  ArrowUpRight,
} from 'lucide-react';
import { getGalleryGroupedByEvent } from '../../services/gallery';
import { GalleryLightbox } from './GalleryLightbox';
import type { EventWithGallery, GalleryPhoto } from '../../types/database';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';

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
      .map((evt) => {
        if (selectedEventFilter !== 'all' && evt.id !== selectedEventFilter) {
          return null;
        }

        if (!searchQuery.trim()) {
          return evt;
        }

        const q = searchQuery.toLowerCase();
        const matchesEvent =
          evt.title.toLowerCase().includes(q) ||
          (evt.description && evt.description.toLowerCase().includes(q)) ||
          (evt.category && evt.category.toLowerCase().includes(q));

        const matchedPhotos = evt.photos.filter(
          (p) => matchesEvent || (p.caption && p.caption.toLowerCase().includes(q))
        );

        if (matchedPhotos.length > 0) {
          return {
            ...evt,
            photos: matchedPhotos,
          };
        }

        return null;
      })
      .filter((evt): evt is EventWithGallery => evt !== null);
  }, [eventsWithGallery, selectedEventFilter, searchQuery]);

  // Total photo count across all events
  const totalPhotosCount = useMemo(() => {
    return eventsWithGallery.reduce((acc, evt) => acc + evt.photos.length, 0);
  }, [eventsWithGallery]);

  const openLightbox = (photoList: GalleryPhoto[], index: number) => {
    setActivePhotoList(photoList);
    setActivePhotoIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-500/20 text-xs font-bold uppercase tracking-wider"
        >
          <Camera className="w-4 h-4 text-blue-500" />
          <span>Cloud Stack Club Moments</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight"
        >
          Event <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-400">Gallery</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal"
        >
          Explore the memories, keynote speeches, hands-on workshops, hackathons, and vibrant cloud community at Chandigarh University.
        </motion.p>
      </div>

      {/* Filter and Search Bar */}
      {eventsWithGallery.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 backdrop-blur-xl shadow-sm">
            {/* Event Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none min-w-0">
              <button
                type="button"
                onClick={() => setSelectedEventFilter('all')}
                className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  selectedEventFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>All Events</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200/80 dark:bg-slate-700/80">
                  {totalPhotosCount}
                </span>
              </button>

              {eventsWithGallery.map((evt) => (
                <button
                  key={evt.id}
                  type="button"
                  onClick={() => setSelectedEventFilter(evt.id)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    selectedEventFilter === evt.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="truncate max-w-[150px] sm:max-w-[200px]">{evt.title}</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200/80 dark:bg-slate-700/80">
                    {evt.photos.length}
                  </span>
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative shrink-0 md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search photos or events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center animate-pulse">
            <Camera className="w-6 h-6 animate-spin" />
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Loading event gallery photos...
          </p>
        </div>
      ) : filteredEvents.length === 0 ? (
        /* Empty State */
        <div className="py-16 px-6 text-center rounded-3xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 backdrop-blur-xl max-w-xl mx-auto space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600/20 to-sky-400/20 text-blue-600 dark:text-sky-400 flex items-center justify-center mx-auto shadow-inner">
            <FolderOpen className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {eventsWithGallery.length === 0 ? 'Gallery Coming Soon' : 'No Matching Photos Found'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto">
              {eventsWithGallery.length === 0
                ? 'Photos from our upcoming hackathons, tech bootcamps, and workshops will be published here directly after each event.'
                : 'Try adjusting your search query or switching the event filter tab above.'}
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            icon={<ArrowUpRight className="w-4 h-4" />}
            onClick={() => navigate('/#events')}
          >
            Explore Upcoming Events
          </Button>
        </div>
      ) : (
        /* Event-Wise Grouped Showcase */
        <div className="space-y-16">
          {filteredEvents.map((eventItem, eventIndex) => (
            <motion.section
              key={eventItem.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: eventIndex * 0.1 }}
              className="space-y-6"
            >
              {/* Event Header Block: Bold Event Title + High-Contrast Readable Description */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-md backdrop-blur-xl relative overflow-hidden group">
                <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-3xl pointer-events-none" />

                <div className="relative z-10 space-y-3">
                  {/* Category & Date Badges */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {eventItem.category && (
                      <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-blue-500/15 text-blue-600 dark:text-sky-400 border border-blue-500/20 flex items-center gap-1.5">
                        <Tag className="w-3 h-3" />
                        {eventItem.category}
                      </span>
                    )}

                    {eventItem.date && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-blue-500" />
                        {new Date(eventItem.date).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    )}

                    {eventItem.location && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-emerald-500" />
                        {eventItem.location}
                      </span>
                    )}

                    <span className="ml-auto px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <ImageIcon className="w-3 h-3 text-blue-500" />
                      {eventItem.photos.length} {eventItem.photos.length === 1 ? 'Photo' : 'Photos'}
                    </span>
                  </div>

                  {/* 1. EVENT NAME WRITTEN IN BOLD LETTERS */}
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                    {eventItem.title}
                  </h2>

                  {/* 2. DESCRIPTION BELOW IT IN A LESS TRANSPARENT / CLEAR READABLE WAY */}
                  {eventItem.description && (
                    <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 font-medium leading-relaxed max-w-4xl pt-1">
                      {eventItem.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Photo Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {eventItem.photos.map((photo, photoIndex) => (
                  <motion.div
                    key={photo.id}
                    whileHover={{ y: -4, scale: 1.01 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => openLightbox(eventItem.photos, photoIndex)}
                    className="group relative h-64 sm:h-72 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-blue-500/40 transition-all cursor-pointer"
                  >
                    {/* Actual Image */}
                    <img
                      src={photo.image_url}
                      alt={photo.caption || eventItem.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />

                    {/* Gradient Overlay on Hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 text-white">
                      <div className="flex items-center justify-between gap-2">
                        {photo.caption ? (
                          <p className="text-xs font-semibold text-white line-clamp-2">
                            {photo.caption}
                          </p>
                        ) : (
                          <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">
                            View Full Photo
                          </span>
                        )}

                        <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md text-white shrink-0">
                          <Maximize2 className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          ))}
        </div>
      )}

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
