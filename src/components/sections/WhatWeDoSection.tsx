import React from 'react';
import { motion } from 'framer-motion';
import { Cloud, Layers, Cpu, Globe, Box, Server, Sparkles, ArrowRight } from 'lucide-react';
import { SectionTitle } from '../ui/SectionTitle';
import { Card } from '../ui/Card';
import { DOMAINS } from '../../constants/data';

const iconMap: Record<string, React.ReactNode> = {
  Cloud: <Cloud className="w-7 h-7 text-blue-500" />,
  Layers: <Layers className="w-7 h-7 text-sky-500" />,
  Cpu: <Cpu className="w-7 h-7 text-cyan-500" />,
  Globe: <Globe className="w-7 h-7 text-indigo-500" />,
  Box: <Box className="w-7 h-7 text-teal-500" />,
  Server: <Server className="w-7 h-7 text-emerald-500" />,
  Sparkles: <Sparkles className="w-7 h-7 text-purple-500" />,
};

export const WhatWeDoSection: React.FC = () => {
  return (
    <section id="domains" className="py-20 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle
          badge="Domains & Tracks"
          title="What We Do"
          subtitle="Explore our specialized technical tracks designed to prepare students for real-world software engineering, cloud architecture, and DevOps careers."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DOMAINS.map((domain, index) => (
            <motion.div
              key={domain.id}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
            >
              <Card
                gradientBorder={true}
                glowOnHover={true}
                className="h-full flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                      {iconMap[domain.iconName]}
                    </div>
                    {domain.badge && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                        {domain.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
                    {domain.title}
                  </h3>

                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {domain.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-sky-400 opacity-80 group-hover:opacity-100 transition-opacity">
                  <span>Explore Track</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
