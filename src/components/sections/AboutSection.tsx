import React from 'react';
import { motion } from 'framer-motion';
import { Target, Eye, Users, Lightbulb, BookOpen, Compass, Rocket, Cloud } from 'lucide-react';
import { SectionTitle } from '../ui/SectionTitle';
import { Card } from '../ui/Card';
import { ABOUT_PILLARS } from '../../constants/data';

const iconMap: Record<string, React.ReactNode> = {
  Target: <Target className="w-6 h-6 text-blue-500" />,
  Eye: <Eye className="w-6 h-6 text-sky-500" />,
  Users: <Users className="w-6 h-6 text-cyan-500" />,
  Lightbulb: <Lightbulb className="w-6 h-6 text-amber-500" />,
  BookOpen: <BookOpen className="w-6 h-6 text-indigo-500" />,
  Rocket: <Rocket className="w-6 h-6 text-violet-500" />,
  Cloud: <Cloud className="w-6 h-6 text-blue-400" />,
};

export const AboutSection: React.FC = () => {
  return (
    <section id="about" className="py-20 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle
          badge="Who We Are"
          title="About Cloud Stack Club"
          subtitle="A student-driven technical community at Chandigarh University empowering you to Learn, Build, Deploy and Scale — through cloud technologies, hands-on projects, and real industry exposure."
        />

        {/* Highlight Banner Inspired by Posters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-14 p-8 sm:p-10 rounded-3xl glass-panel gradient-border-card bg-gradient-to-r from-blue-900/20 via-sky-900/10 to-indigo-900/20 relative overflow-hidden"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-600 dark:text-sky-400">
                <Compass className="w-4 h-4" />
                Cloud · Powering the Future
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                Learn • Build • Deploy • Scale
              </h3>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Cloud Stack Club bridges the gap between classroom theory and industry practice. Whether you are starting your cloud journey or scaling production workloads, we provide the launchpad, community, and mentorship to take you further.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 shrink-0 w-full md:w-auto">
              <div className="p-4 rounded-2xl glass-panel text-center">
                <p className="text-2xl sm:text-3xl font-black text-gradient">100+</p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Active Members</p>
              </div>
              <div className="p-4 rounded-2xl glass-panel text-center">
                <p className="text-2xl sm:text-3xl font-black text-gradient">5+</p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Workshops & Events</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 5 Pillar Cards (Mission, Vision, Community, Innovation, Learning) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ABOUT_PILLARS.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full flex flex-col justify-between group">
                <div className="space-y-4">
                  <div className="p-3 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 w-fit group-hover:scale-110 transition-transform duration-300">
                    {iconMap[item.iconName]}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
