import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Search,
  Users,
  ScrollText,
  ArrowRight,
  Filter,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { getEvents } from '../services/events';
import { getEventRegistrationCountsMap } from '../services/registrationForms';
import { formatEventDate, formatEventTime, isRegistrationFull } from '../utils/formatters';
import { generateSlug } from '../utils/slug';
import { EVENT_CATEGORY_OPTIONS, type EventCategoryOption } from '../constants/data';
import type { Event } from '../types/database';

export const EventsDirectoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'live' | 'completed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [registrationCounts, setRegistrationCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const [eventsData, countsMap] = await Promise.all([
          getEvents(),
          getEventRegistrationCountsMap(),
        ]);
        if (isMounted) {
          setEvents(eventsData || []);
          setRegistrationCounts(countsMap || {});
        }
      } catch (err) {
        console.error('Failed to load events directory:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter events based on status, category, and search query
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      if (evt.status === 'cancelled') return false;

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'live' && evt.status !== 'live') return false;
        if (statusFilter === 'upcoming' && evt.status !== 'upcoming') return false;
        if (statusFilter === 'completed' && evt.status !== 'completed') return false;
      }

      // Category filter
      if (categoryFilter !== 'all') {
        const eventCat = (evt.category || '').toLowerCase();
        if (eventCat !== categoryFilter.toLowerCase()) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = evt.title.toLowerCase().includes(q);
        const matchesDesc = (evt.description || '').toLowerCase().includes(q);
        const matchesLocation = (evt.location || '').toLowerCase().includes(q);
        const matchesCat = (evt.category || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesLocation && !matchesCat) {
          return false;
        }
      }

      return true;
    });
  }, [events, statusFilter, categoryFilter, searchQuery]);

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
      {/* Top Breadcrumb / Back button */}
      <div className="mb-6 flex items-center gap-2">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-sky-400 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs font-bold text-blue-600 dark:text-sky-400">Events Directory</span>
      </div>

      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-500/10 dark:bg-sky-500/15 text-blue-600 dark:text-sky-400 border border-blue-500/20 shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Cloud Stack Club Events</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight"
        >
          Explore All Events & Workshops
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-medium leading-relaxed"
        >
          Discover cutting-edge cloud computing workshops, competitive hackathons, and industry mentorship sessions. Explore event details, rules, and view past event highlights.
        </motion.p>
      </div>

      {/* Filter and Search Bar Controls */}
      <div className="mb-10 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 w-full md:w-auto overflow-x-auto">
            {(
              [
                { id: 'all', label: 'All Events' },
                { id: 'upcoming', label: 'Upcoming' },
                { id: 'live', label: 'Ongoing' },
                { id: 'completed', label: 'Completed' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input & Category Dropdown */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>

            {/* Category Filter */}
            <div className="relative w-full sm:w-48">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer"
              >
                <option value="all">All Categories</option>
                {EVENT_CATEGORY_OPTIONS.map((cat: EventCategoryOption) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-4 animate-pulse"
            >
              <div className="h-48 rounded-2xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-6 w-3/4 rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-1/2 rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 space-y-3">
          <Filter className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No Events Match Your Filters
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Try adjusting your search query, status tab, or category filter to discover more club events.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setCategoryFilter('all');
            }}
            className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          <AnimatePresence>
            {filteredEvents.map((evt, index) => {
              const currentCount = registrationCounts[evt.id] || 0;
              const isFull = isRegistrationFull(evt, currentCount);
              const remainingSeats =
                evt.max_registrations !== null && evt.max_registrations !== undefined
                  ? Math.max(0, evt.max_registrations - currentCount)
                  : null;
              const slug = evt.slug || generateSlug(evt.title);

              return (
                <motion.div
                  key={evt.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
                  onClick={() => navigate(`/events/${slug}`)}
                  className="rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:border-blue-500/40 dark:hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/10 transition-all flex flex-col justify-between group cursor-pointer"
                >
                  {/* Poster Thumbnail */}
                  <div className="relative h-52 w-full overflow-hidden bg-slate-900">
                    {evt.image_url ? (
                      <img
                        src={evt.image_url}
                        alt={evt.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-900/40 to-slate-950 p-6 text-center">
                        <Sparkles className="w-10 h-10 text-blue-400/60 mb-2" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Cloud Stack Club
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

                    {/* Status & Category Badges */}
                    <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2 pointer-events-none">
                      {/* Event Status Pill */}
                      {evt.status === 'live' ? (
                        <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/90 text-white shadow-md backdrop-blur-sm flex items-center gap-1.5 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                          Ongoing Event
                        </span>
                      ) : evt.status === 'upcoming' ? (
                        <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-blue-600/90 text-white shadow-md backdrop-blur-sm flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Upcoming Event
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-800/85 text-slate-300 shadow-md backdrop-blur-sm">
                          Completed
                        </span>
                      )}

                      {/* Category Pill */}
                      {evt.category && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-950/80 text-white border border-white/10 backdrop-blur-sm">
                          {evt.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors line-clamp-1">
                        {evt.title}
                      </h3>

                      {evt.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">
                          {evt.description}
                        </p>
                      )}

                      {/* Metadata: Date, Time, Location */}
                      <div className="pt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>{formatEventDate(evt.date)}</span>
                          {evt.start_time && (
                            <>
                              <span className="text-slate-400">•</span>
                              <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span>{formatEventTime(evt.start_time)}</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="truncate">{evt.location || 'Chandigarh University'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Features & Action Button */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                      {/* Seat Capacity / Rules Badge */}
                      <div className="min-w-0">
                        {evt.status === 'upcoming' && remainingSeats !== null ? (
                          isFull ? (
                            <span className="text-[11px] font-bold text-red-600 dark:text-red-400">
                              Registration Full
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />
                              {remainingSeats} seats available
                            </span>
                          )
                        ) : evt.rules ? (
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <ScrollText className="w-3 h-3 text-blue-500" />
                            Rules available
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-semibold">
                            Open Access
                          </span>
                        )}
                      </div>

                      {/* Explore Button */}
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-sky-400 group-hover:translate-x-0.5 transition-transform">
                        <span>Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
