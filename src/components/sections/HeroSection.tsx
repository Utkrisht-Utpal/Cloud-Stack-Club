import React from 'react';
import { motion, MotionConfig } from 'framer-motion';
import { ArrowRight, Calendar, Terminal, Cpu } from 'lucide-react';
import { Button } from '../ui/Button';
import { TECH_BADGES } from '../../constants/data';
import { ClubLogo } from '../ui/ClubLogo';


interface HeroSectionProps {
  onJoinClick: () => void;
  onExploreEventsClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onJoinClick, onExploreEventsClick }) => {
  return (
    <section id="hero" className="relative min-h-[92vh] flex items-center justify-center pt-28 pb-16 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">

        {/* Top Announcement Pill*/}
        <div className="flex justify-center mb-6 sm:mb-8">
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="inline-flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-4 py-1.5 rounded-full bg-[#e6ecf5] dark:bg-slate-900/90 shadow-[3px_3px_8px_rgba(163,177,198,0.5),-3px_-3px_8px_#ffffff] dark:shadow-none dark:border dark:border-blue-500/30 text-[10px] sm:text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors max-w-full overflow-hidden"
          >
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </span>

            <span className="font-extrabold tracking-wide uppercase whitespace-nowrap shrink-0">
              <span className="text-red-600 dark:text-red-500">CHANDIGARH</span>{' '}
              <span className="text-slate-900 dark:text-white">UNIVERSITY</span>
            </span>

            <span className="text-slate-400 hidden xs:inline">•</span>
            <span className="text-slate-700 dark:text-slate-300 font-medium truncate hidden sm:inline">Empowering Student Builders</span>
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
            className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.1]"
          >
            <MotionConfig reducedMotion="never">
              <motion.span
                className="hero-title-gradient"
                animate={{
                  opacity: [1, 0.82, 1],
                  scale: [1, 1.018, 1],
                }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  repeatType: 'loop',
                }}
              >
                Cloud Stack Club
              </motion.span>
            </MotionConfig>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mt-6 text-lg sm:text-2xl font-medium text-slate-700 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed"
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
              icon={<Calendar className="w-5 h-5 text-blue-600 dark:text-sky-400" />}
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
            <p className="text-xs uppercase font-bold tracking-widest text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
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
                className="px-4 py-2 rounded-2xl bg-[#e6ecf5] dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 shadow-[3px_3px_8px_rgba(163,177,198,0.5),-3px_-3px_8px_#ffffff] dark:shadow-none dark:border dark:border-slate-800 hover:text-blue-600 dark:hover:text-sky-400 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-sky-400" />
                <span>{tech.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#dce3f0] dark:bg-slate-800 text-blue-700 dark:text-slate-400 shadow-[inset_1px_1px_3px_rgba(163,177,198,0.4),inset_-1px_-1px_3px_#ffffff] dark:shadow-none font-bold">
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
          className="mt-14 max-w-3xl mx-auto rounded-2xl p-5 bg-[#e6ecf5] dark:bg-slate-950 border border-white/60 dark:border-slate-800/80 shadow-[7px_7px_18px_rgba(163,177,198,0.6),-7px_-7px_18px_#ffffff] dark:shadow-2xl text-slate-900 dark:text-slate-100 hidden sm:block relative overflow-hidden"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-300/80 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-2 text-xs font-mono text-slate-700 dark:text-slate-400 flex items-center gap-1.5 font-bold">
                <Terminal className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                cloud-stack-club@cu:~
              </span>
            </div>
            <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-extrabold">● v2026.2 (Active)</span>
          </div>
          <div className="pt-3 font-mono text-xs sm:text-sm space-y-2">
            <p className="flex items-center gap-2">
              <span className="text-blue-700 dark:text-sky-400 font-extrabold">$</span>
              <span className="text-slate-900 dark:text-slate-100 font-bold">agy init --club "Cloud Stack"</span>
            </p>
            <p className="text-emerald-700 dark:text-emerald-400 font-extrabold flex items-center gap-1.5">
              <span>✔</span>
              <span>Initializing Chandigarh University Cloud Stack Developer Network...</span>
            </p>
            <p className="flex items-center gap-2 pt-1">
              <span className="text-blue-700 dark:text-sky-400 font-extrabold">$</span>
              <span className="text-slate-900 dark:text-slate-100 font-bold">deploy --target "Future Engineers" --status "Ready to innovate"</span>
            </p>
            <p className="text-blue-700 dark:text-sky-300 font-extrabold flex items-center gap-1.5 pt-0.5">
              <span>🚀</span>
              <span>Successfully deployed: AWS, Kubernetes, Docker, DevOps, Full-Stack</span>
            </p>
          </div>
        </motion.div>

      </div>
    </section>
  );
};
