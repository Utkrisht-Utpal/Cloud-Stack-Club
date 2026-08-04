import React from 'react';
import { motion } from 'framer-motion';
import { Cloud, BookOpen, Code, Users, TrendingUp, Briefcase } from 'lucide-react';
import { SectionTitle } from '../ui/SectionTitle';
import { WHY_JOIN_REASONS } from '../../constants/data';

const iconMap: Record<string, React.ReactNode> = {
  Cloud: <Cloud className="w-6 h-6 text-blue-500 dark:text-blue-400" />,
  BookOpen: <BookOpen className="w-6 h-6 text-sky-500 dark:text-sky-400" />,
  Code: <Code className="w-6 h-6 text-cyan-500 dark:text-cyan-400" />,
  Users: <Users className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />,
  TrendingUp: <TrendingUp className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />,
  Briefcase: <Briefcase className="w-6 h-6 text-violet-500 dark:text-violet-400" />,
};

export const WhyJoinSection: React.FC = () => {
  return (
    <section className="py-20 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle
          badge="Core Values"
          title="Why Join Cloud Stack?"
          subtitle="Our six core values define who we are — Think Cloud, Learn Daily, Build Fearlessly, Collaborate, Grow Together, and gain Industry Exposure. This is the culture you join."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {WHY_JOIN_REASONS.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <div className="neumorphic-card p-6 h-full group cursor-default">
                <div className="flex items-start gap-4">
                  <div className="neumorphic-icon p-3 shrink-0 group-hover:scale-95 transition-transform duration-300">
                    {iconMap[item.iconName]}
                  </div>
                  <div className="space-y-2 pt-0.5">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100
                      group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
