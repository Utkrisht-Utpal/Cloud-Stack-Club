import React from 'react';
import { motion } from 'framer-motion';
import { Cloud, Layers, Cpu, Globe, Box, Sparkles, ArrowRight } from 'lucide-react';
import { SectionTitle } from '../ui/SectionTitle';
import { DOMAINS } from '../../constants/data';

const iconMap: Record<string, React.ReactNode> = {
  Cloud: <Cloud className="w-7 h-7 text-blue-400" />,
  Layers: <Layers className="w-7 h-7 text-sky-400" />,
  Cpu: <Cpu className="w-7 h-7 text-cyan-400" />,
  Globe: <Globe className="w-7 h-7 text-indigo-400" />,
  Box: <Box className="w-7 h-7 text-teal-400" />,
  Sparkles: <Sparkles className="w-7 h-7 text-purple-400" />,
};

export const WhatWeDoSection: React.FC = () => {
  return (
    <section id="domains" className="py-20 relative z-10">
      {/* Glassmorphism ambient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-indigo-500/8 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-48 h-48 rounded-full bg-cyan-500/8 blur-2xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section badge marking the UI style */}
        <div className="flex justify-center mb-4">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold
            bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10
            text-blue-600 dark:text-sky-400 shadow-sm">
            ✦ Glassmorphism UI
          </span>
        </div>

        <SectionTitle
          badge="Domains & Tracks"
          title="What We Do"
          subtitle="Explore our specialized technical tracks designed to prepare students for real-world software engineering, cloud architecture, and DevOps careers."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DOMAINS.map((domain, index) => (
            <motion.div
              key={domain.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
            >
              <div className="glass-card rounded-2xl p-6 h-full flex flex-col justify-between group cursor-pointer">
                <div>
                  {/* Icon + badge row */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="p-3 rounded-2xl bg-white/20 dark:bg-white/5 backdrop-blur-sm
                      border border-white/30 dark:border-white/10
                      group-hover:scale-110 transition-transform duration-300">
                      {iconMap[domain.iconName]}
                    </div>
                    {domain.badge && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold
                        bg-sky-500/15 text-sky-600 dark:text-sky-300
                        border border-sky-500/25 backdrop-blur-sm">
                        {domain.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white
                    group-hover:text-blue-600 dark:group-hover:text-sky-300 transition-colors">
                    {domain.title}
                  </h3>

                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {domain.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/20 dark:border-white/8
                  flex items-center justify-between
                  text-xs font-semibold text-blue-600 dark:text-sky-400
                  opacity-70 group-hover:opacity-100 transition-opacity">
                  <span>Explore Track</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
