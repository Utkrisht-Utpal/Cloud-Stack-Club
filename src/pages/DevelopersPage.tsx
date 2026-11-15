import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  ExternalLink,
  Mail,
  MapPin,
  GraduationCap,
  Sparkles,
  Layers,
  Terminal,
  ArrowLeft,
  Flame,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { DEVELOPERS_DATA, type DeveloperProfile } from '../data/developers';
import { Button } from '../components/ui/Button';
import { GithubIcon, LinkedinIcon } from '../components/ui/SocialIcons';

export const DevelopersPage: React.FC = () => {
  const navigate = useNavigate();
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  const handleResumeDownload = (dev: DeveloperProfile) => {
    // If running in development and file doesn't exist, provide a helpful friendly hint
    fetch(dev.resumeUrl, { method: 'HEAD' })
      .then((res) => {
        if (!res.ok) {
          // Open LinkedIn profile as a fallback if PDF is not placed in public folder yet
          setDownloadNotice(
            `Notice: Please place "${dev.resumeFileName}" in the public/resumes/ folder. Redirecting to ${dev.name}'s LinkedIn profile...`
          );
          setTimeout(() => {
            window.open(dev.linkedinUrl, '_blank', 'noopener,noreferrer');
            setDownloadNotice(null);
          }, 1800);
        } else {
          // File exists, trigger real download
          const link = document.createElement('a');
          link.href = dev.resumeUrl;
          link.download = dev.resumeFileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      })
      .catch(() => {
        window.open(dev.linkedinUrl, '_blank', 'noopener,noreferrer');
      });
  };

  return (
    <div className="min-h-screen pt-28 sm:pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12 sm:space-y-16">
      {/* Header Section: Navigation & Hero */}
      <div className="space-y-6 sm:space-y-8">
        {/* Top Line: Back Button & Architects Pill */}
        <div className="relative flex items-center justify-between sm:justify-center">
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate(-1)}
            className="sm:absolute sm:left-0 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-sky-400 border border-slate-200/80 dark:border-slate-800 transition-all cursor-pointer group shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back</span>
          </motion.button>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 via-sky-500/10 to-indigo-500/10 border border-blue-500/20 text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-slate-200"
          >
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            <span>Architects of Cloud Stack Club</span>
          </motion.div>
        </div>

        {/* Hero Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-tight"
          >
            Meet the{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 dark:from-sky-400 dark:via-blue-400 dark:to-indigo-400">
              Developers
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal"
          >
            The minds and hands behind the architecture, design, and continuous engineering of the{' '}
            <strong className="text-slate-900 dark:text-white font-semibold">
              Cloud Stack Club
            </strong>{' '}
            digital ecosystem at Chandigarh University.
          </motion.p>
        </div>
      </div>

      {/* Download Alert Notice (if triggered) */}
      {downloadNotice && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs font-medium text-amber-700 dark:text-amber-300 text-center shadow-md backdrop-blur-md"
        >
          {downloadNotice}
        </motion.div>
      )}

      {/* Developers Showcase Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-stretch">
        {DEVELOPERS_DATA.map((dev, idx) => (
          <motion.div
            key={dev.id}
            id={dev.id}
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: idx * 0.15 }}
            className="group relative flex flex-col justify-between rounded-3xl p-6 sm:p-8 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:shadow-2xl hover:border-blue-500/40 dark:hover:border-sky-500/40 transition-all duration-300"
          >
            {/* Ambient Background Glow on Hover */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/10 dark:bg-sky-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/20 transition-all" />

            <div className="space-y-6 relative z-10">
              {/* Header: Photo, Name & Badges */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                {/* Avatar with Halo Ring */}
                <div className="relative shrink-0">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl p-1 bg-gradient-to-tr from-blue-600 via-sky-400 to-indigo-500 shadow-lg group-hover:scale-105 transition-transform duration-300">
                    <div className="w-full h-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900">
                      <img
                        src={dev.avatarUrl}
                        alt={dev.name}
                        onError={(e) => {
                          // Fallback in case GitHub avatar is blocked or offline
                          const target = e.target as HTMLImageElement;
                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            dev.name
                          )}&background=0284c7&color=fff&size=256&bold=true`;
                        }}
                        className="w-full h-full object-cover scale-[1.04]"
                      />
                    </div>
                  </div>
                  {/* Status Indicator */}
                  <span
                    className="absolute -bottom-1 -right-1 flex h-4 w-4 rounded-full ring-2 ring-white dark:ring-slate-900 bg-emerald-500"
                    title="Active Developer"
                  />
                </div>

                {/* Name & Credentials */}
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      {dev.name}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-500/20">
                      {dev.badge}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-blue-600 dark:text-sky-400">
                    {dev.role}
                  </p>

                  <div className="pt-1 flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span>{dev.education}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span>{dev.location}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio & Headline */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 italic">
                  "{dev.headline}"
                </p>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {dev.bio}
                </p>
              </div>

              {/* Key Platform Contributions */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-500 dark:text-sky-400" />
                  <span>Platform Contributions</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {dev.keyContributions.map((contrib, cIdx) => (
                    <div
                      key={cIdx}
                      className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60 space-y-1 hover:border-blue-500/30 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                          {contrib.title}
                        </span>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-sky-400 shrink-0">
                          {contrib.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal line-clamp-2">
                        {contrib.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technologies & Stacks */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-blue-500 dark:text-sky-400" />
                  <span>Technologies & Skills</span>
                </h4>

                <div className="space-y-2.5">
                  {dev.techStack.map((group, gIdx) => (
                    <div key={gIdx} className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        {group.category}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {group.skills.map((skill, sIdx) => (
                          <span
                            key={sIdx}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                              skill.hot
                                ? 'bg-blue-500/10 dark:bg-sky-500/15 text-blue-600 dark:text-sky-300 border-blue-500/25 shadow-xs'
                                : 'bg-slate-100/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300'
                            }`}
                          >
                            {skill.hot && (
                              <Flame className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                            )}
                            <span>{skill.name}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions: Resume Button & Social Profiles */}
            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800/90 flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
              {/* Primary Resume Download Button */}
              <Button
                variant="primary"
                size="md"
                onClick={() => handleResumeDownload(dev)}
                icon={<Download className="w-4 h-4" />}
                className="w-full sm:w-auto shadow-md"
              >
                Download Resume
              </Button>

              {/* Social Icon Pills */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <a
                  href={dev.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl glass-panel text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
                  title={`${dev.name}'s GitHub Profile`}
                  aria-label="GitHub Profile"
                >
                  <GithubIcon className="w-4 h-4" />
                </a>

                <a
                  href={dev.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl glass-panel text-[#0a66c2] dark:text-[#0077b5] hover:bg-blue-500/10 border border-slate-200 dark:border-slate-800 transition-colors"
                  title={`${dev.name}'s LinkedIn Profile`}
                  aria-label="LinkedIn Profile"
                >
                  <LinkedinIcon className="w-4 h-4" />
                </a>

                <a
                  href={`mailto:${dev.email}`}
                  className="p-2.5 rounded-xl glass-panel text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-blue-500/10 border border-slate-200 dark:border-slate-800 transition-colors"
                  title={`Email ${dev.name}`}
                  aria-label="Send Email"
                >
                  <Mail className="w-4 h-4" />
                </a>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Engineering Philosophy & Club Architecture Callout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/80 text-white border border-slate-800 shadow-2xl space-y-6"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 uppercase tracking-wider">
              <Terminal className="w-3.5 h-3.5" />
              <span>Engineering Standard</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">
              Crafted With Clean Code & Modern Cloud Best Practices
            </h3>
          </div>

          <Link
            to="/#about"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold border border-white/15 transition-colors shrink-0"
          >
            <span>Explore Club Vision</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal max-w-4xl">
          Cloud Stack Club’s digital platform was engineered from the ground up as a production-grade web application.
          Leveraging <span className="text-sky-400 font-semibold">React 19</span>,{' '}
          <span className="text-sky-400 font-semibold">TypeScript</span>, and{' '}
          <span className="text-sky-400 font-semibold">Tailwind CSS v4</span>, the architecture delivers reactive data synchronization with Supabase, dynamic PDF/Excel generation, sub-100ms client-side route transitions, and robust role-based access control.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Frontend Core</span>
            <p className="text-xs sm:text-sm font-black text-slate-100">React 19 + Vite</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Type System</span>
            <p className="text-xs sm:text-sm font-black text-slate-100">TypeScript 5+</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Styling Architecture</span>
            <p className="text-xs sm:text-sm font-black text-slate-100">Tailwind CSS v4</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Cloud Backend</span>
            <p className="text-xs sm:text-sm font-black text-slate-100">Supabase + PostgreSQL</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DevelopersPage;
