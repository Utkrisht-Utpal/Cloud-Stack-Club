import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Award } from 'lucide-react';
import { SectionTitle } from '../ui/SectionTitle';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { EVENT_CATEGORIES } from '../../constants/data';
import type { EventCategoryItem } from '../../types';

export const EventsSection: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<EventCategoryItem | null>(null);

  return (
    <section id="events" className="py-20 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle
          badge="Club Activities"
          title="Event Categories"
          subtitle="From 48-hour hackathons to hands-on cloud bootcamps, our event series offers unmatched practical learning opportunities throughout the academic year."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {EVENT_CATEGORIES.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
            >
              <div className="neumorphic-card h-full flex flex-col justify-between overflow-hidden p-0 group">
                <div className="relative h-48 w-full overflow-hidden bg-slate-900">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                  <span className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold bg-blue-600/90 text-white shadow-md backdrop-blur-sm">
                    {event.badge}
                  </span>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
                      {event.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {event.description}
                    </p>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<ArrowRight className="w-4 h-4" />}
                      className="w-full group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all"
                      onClick={() => setSelectedEvent(event)}
                    >
                      Learn More
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Modal for Event Category Details */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title || 'Event Details'}
      >
        {selectedEvent && (
          <div className="space-y-5">
            <div className="h-40 rounded-2xl overflow-hidden relative">
              <img
                src={selectedEvent.image}
                alt={selectedEvent.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent flex items-end p-4">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-500 text-white">
                  {selectedEvent.badge}
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              {selectedEvent.description}
            </p>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <Award className="w-4 h-4" />
                Key Highlights
              </h4>
              <ul className="space-y-2">
                {selectedEvent.features.map((feature, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">Upcoming sessions posted on WhatsApp/Socials</span>
              <Button variant="primary" size="sm" onClick={() => setSelectedEvent(null)}>
                Got It
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
};
