import React from 'react';
import { motion } from 'framer-motion';
import { Cloud, Layers, Cpu, Globe, Box, Sparkles } from 'lucide-react';
import { SectionTitle } from '../ui/SectionTitle';
import { DOMAINS } from '../../constants/data';

const iconMap: Record<string, React.ReactNode> = {
  Cloud: <Cloud className="w-7 h-7 text-blue-500 dark:text-blue-400" />,
  Layers: <Layers className="w-7 h-7 text-sky-500 dark:text-sky-400" />,
  Cpu: <Cpu className="w-7 h-7 text-cyan-500 dark:text-cyan-400" />,
  Globe: <Globe className="w-7 h-7 text-indigo-500 dark:text-indigo-400" />,
  Box: <Box className="w-7 h-7 text-teal-500 dark:text-teal-400" />,
  Sparkles: <Sparkles className="w-7 h-7 text-purple-500 dark:text-purple-400" />,
};

export const WhatWeDoSection: React.FC = () => {
  return (
    <section id="domains" className="py-20 relative z-10 bg-slate-100/30 dark:bg-[#080f1e]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle
          badge="Domains & Tracks"
          title="What We Do"
          subtitle="Explore our specialized technical tracks designed to prepare students for real-world software engineering, cloud architecture, and DevOps careers."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {DOMAINS.map((domain, index) => (
            <motion.div
              key={domain.id}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
            >
              <div className="neumorphic-card p-6 h-full flex flex-col group cursor-pointer">
                {/* Icon + badge row */}
                <div className="flex items-center justify-between mb-5">
                  <div className="neumorphic-icon p-3 group-hover:scale-95 transition-transform duration-300">
                    {iconMap[domain.iconName]}
                  </div>
                  {domain.badge && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-slate-800/60 dark:text-sky-400 dark:border-slate-700/60">
                      {domain.badge}
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-slate-800 dark:text-white
                  group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
                  {domain.title}
                </h3>

                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 leading-relaxed flex-1">
                  {domain.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
