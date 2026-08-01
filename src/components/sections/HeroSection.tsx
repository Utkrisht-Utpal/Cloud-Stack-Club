import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, Terminal, Cpu } from 'lucide-react';
import { Button } from '../ui/Button';
import { TECH_BADGES } from '../../constants/data';
import { ClubLogo } from '../ui/ClubLogo';
import { siteConfig } from '../../constants/siteConfig';

interface HeroSectionProps {
  onJoinClick: () => void;
  onExploreEventsClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onJoinClick, onExploreEventsClick }) => {
  return (
    <section id="hero" className="relative min-h-[92vh] flex items-center justify-center pt-28 pb-16 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        
        {/* Top Announcement Pill (Removed red CU badge as requested) */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full glass-panel border-blue-500/30 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-lg shadow-blue-500/5 hover:border-blue-500/60 transition-colors"
          >
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </span>

            <span className="font-extrabold tracking-wide uppercase">
              <span className="text-red-600 dark:text-red-500">CHANDIGARH</span>{' '}
              <span className="text-slate-900 dark:text-white">UNIVERSITY</span>
            </span>

            <span className="text-slate-400">•</span>
            <span className="text-slate-600 dark:text-slate-300 font-medium">Empowering Student Builders</span>
          </motion.div>
        </div>

        {/* Main Hero Header */}
        <div className="text-center max-w-4xl mx-auto">
          {/* Main Shield Logo Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="flex justify-center mb-6"
          >
            <ClubLogo size="lg" showText={false} />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]"
          >
            <span className="inline-block">Cloud Stack</span>{' '}
            <span className="text-gradient">Club</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mt-6 text-lg sm:text-2xl font-medium text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed"
          >
            To empower students with cloud technologies, hands-on learning and industry exposure to build innovative solutions and become future-ready professionals.
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              variant="primary"
              size="lg"
              icon={<ArrowRight className="w-5 h-5" />}
              onClick={onJoinClick}
              className="w-full sm:w-auto shadow-xl shadow-blue-500/25"
            >
              Join Club
            </Button>

            <Button
              variant="glass"
              size="lg"
              icon={<Calendar className="w-5 h-5 text-blue-500" />}
              onClick={onExploreEventsClick}
              className="w-full sm:w-auto"
            >
              Explore Events
            </Button>
          </motion.div>
        </div>

        {/* Floating Technology Badges Showcase */}
        <div className="mt-14 sm:mt-16">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.05 }}
            className="text-center mb-5"
          >
            <p className="text-xs uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500 flex items-center justify-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-blue-500" />
              Technologies & Frameworks We Work On
            </p>
          </motion.div>

          <div className="flex flex-wrap items-center justify-center gap-3 max-w-4xl mx-auto">
            {TECH_BADGES.map((tech, index) => (
              <motion.div
                key={tech.name}
                initial={{ opacity: 0, scale: 0.9, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  duration: 0.2,
                  delay: 0.08 + index * 0.02,
                  type: 'spring',
                  stiffness: 350,
                  damping: 25,
                }}
                whileHover={{ scale: 1.08, y: -3, transition: { duration: 0.15 } }}
                className="px-4 py-2 rounded-2xl glass-panel text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-800 shadow-md hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-sky-400 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span>{tech.name}</span>
                <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800">
                  {tech.category}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Terminal / Code Visual Accent Card */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="mt-14 max-w-3xl mx-auto rounded-2xl glass-panel p-5 border-blue-500/20 shadow-2xl bg-slate-950/80 text-slate-200 hidden sm:block"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="ml-2 text-xs font-mono text-slate-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-sky-400" />
                cloud-stack-club@cu:~
              </span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 font-medium">● v2026.1 (Active)</span>
          </div>
          <div className="pt-3 font-mono text-xs sm:text-sm space-y-1.5 text-slate-300">
            <p className="text-slate-400"><span className="text-sky-400">$</span> agy init --community "Cloud Stack Club"</p>
            <p className="text-emerald-400">✔ Initializing Chandigarh University Cloud Stack Developer Network...</p>
            <p className="text-slate-300"><span className="text-sky-400">$</span> deploy --target "Future Engineers" --status "Ready to innovate"</p>
            <p className="text-blue-400">🚀 Successfully deployed: AWS, Kubernetes, Docker, DevOps, Full-Stack</p>
          </div>
        </motion.div>

      </div>
    </section>
  );
};
