import React from 'react';
import { motion } from 'framer-motion';
import { Cloud, BookOpen, Code, Users, TrendingUp, Briefcase } from 'lucide-react';
import { SectionTitle } from '../ui/SectionTitle';
import { Card } from '../ui/Card';
import { WHY_JOIN_REASONS } from '../../constants/data';

const iconMap: Record<string, React.ReactNode> = {
  Cloud: <Cloud className="w-6 h-6 text-blue-400" />,
  BookOpen: <BookOpen className="w-6 h-6 text-sky-500" />,
  Code: <Code className="w-6 h-6 text-cyan-500" />,
  Users: <Users className="w-6 h-6 text-indigo-500" />,
  TrendingUp: <TrendingUp className="w-6 h-6 text-emerald-500" />,
  Briefcase: <Briefcase className="w-6 h-6 text-violet-500" />,
};

export const WhyJoinSection: React.FC = () => {
  return (
    <section className="py-20 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle
          badge="Core Values"
          title="Why Join Cloud Stack?"
          subtitle="Our five core values define who we are — Think Cloud, Learn Daily, Build Fearlessly, Collaborate, and Grow Together. This is the culture you join when you become part of Cloud Stack Club."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {WHY_JOIN_REASONS.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card className="h-full group hover:border-blue-500/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 shrink-0 group-hover:scale-110 transition-transform">
                    {iconMap[item.iconName]}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
