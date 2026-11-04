import React from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Award,
  Medal,
  Cloud,
  Cpu,
  CheckCircle2,
  TrendingUp,
  Globe,
  Sparkles,
} from 'lucide-react';

interface AchievementItem {
  id: string;
  title: string;
  category: string;
  date?: string;
  badge: string;
  description: string;
  highlights: string[];
  icon: React.ElementType;
  gradient: string;
}

const STATS = [
  { label: 'Industry Oriented Certificate', value: '50+', icon: Award, color: 'text-blue-600 dark:text-sky-400' },
  { label: 'Hackathons & Competitions', value: '3+', icon: Trophy, color: 'text-amber-500' },
  { label: 'Active Cloud Builders', value: '200+', icon: Cloud, color: 'text-cyan-500' },
  { label: 'Technical Bootcamps & Workshops', value: '5+', icon: Cpu, color: 'text-indigo-500' },
];

const ACHIEVEMENTS: AchievementItem[] = [
  {
    id: 'hackathon-champions',
    title: 'National & Inter-University Hackathon Victories',
    category: 'Competition Excellence',
    date: '2025 - 2026',
    badge: '1st Place & Finalists',
    description:
      'Cloud Stack Club teams have consistently secured top podium spots at national and university hackathons, presenting scalable cloud native architectures, edge computing solutions, and AI-driven platforms.',
    highlights: [
      'Top 3 Finish in Inter-University Hackathon Series',
      'Smart Cloud Automation Award for Zero-Downtime Microservices',
      'Recognized for Best Architectural Design & Live Cloud Deployment',
    ],
    icon: Trophy,
    gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
  },
  {
    id: 'cloud-cert-drive',
    title: 'AWS & Azure Cloud Certification Milestones',
    category: 'Industry Credentials',
    date: 'Ongoing Initiative',
    badge: '50+ Verified Badges',
    description:
      'Through guided peer cohorts and hands-on exam prep workshops, over 50 members have earned official industry certifications across AWS, Microsoft Azure, and Kubernetes.',
    highlights: [
      'AWS Certified Cloud Practitioner & Solutions Architect Associate',
      'Microsoft Certified: Azure Fundamentals (AZ-900)',
      '100% Student-led peer study groups and mock labs',
    ],
    icon: Medal,
    gradient: 'from-blue-500/20 via-sky-500/10 to-transparent',
  },
  {
    id: 'enterprise-visits',
    title: 'Enterprise IT & Data Center Excursions',
    category: 'Corporate Exposure',
    date: 'Annual Program',
    badge: 'Field Exposure',
    description:
      'Organized immersive industrial visits for club members to explore enterprise-grade data centers, telecom network hubs, and leading IT innovation centers in Chandigarh & Mohali.',
    highlights: [
      'Firsthand inspection of enterprise server racks and cooling infrastructure',
      'Live interactions with Senior Cloud Operations & DevOps Engineers',
      'Bridging classroom theory with real-world datacenter engineering',
    ],
    icon: Globe,
    gradient: 'from-indigo-500/20 via-purple-500/10 to-transparent',
  },
  {
    id: 'bootcamps-workshops',
    title: 'Hands-on Cloud, Docker & DevOps Bootcamps',
    category: 'Skill Building',
    date: 'Semester Highlights',
    badge: '5+ Cohorts',
    description:
      'Conducted high-intensity coding bootcamps and live deployment masterclasses empowering 500+ student participants to deploy their first Docker containers and Kubernetes pods.',
    highlights: [
      'Hands-on Dockerization & CI/CD deployment masterclasses',
      'Serverless computing and AI-enhanced microservices architecture',
      'Project-based certificates awarded to verified learners',
    ],
    icon: Cpu,
    gradient: 'from-sky-500/20 via-cyan-500/10 to-transparent',
  },
  {
    id: 'student-placements',
    title: 'Placements & Cloud Engineering Internships',
    category: 'Career Impact',
    date: 'Continuous Success',
    badge: 'Career Success',
    description:
      'Core club alumni and members have leveraged their real-world club project experience and cloud certifications to land internships and full-time roles at top tier tech firms.',
    highlights: [
      'Roles secured in Cloud Architecture, DevOps, and Full Stack Engineering',
      'Real-world portfolio projects demonstrating live production deployments',
      'Active mentorship network connecting seniors with junior members',
    ],
    icon: TrendingUp,
    gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
  },
  {
    id: 'open-source-platform',
    title: 'University Community Web Platform & Infrastructure',
    category: 'Technical Innovation',
    date: 'Production Deployed',
    badge: 'Flagship Project',
    description:
      'Architected and deployed the official high-performance Cloud Stack Club platform using React 19, Supabase PostgreSQL, Cloudflare R2 CDN, and zero-trust security workers.',
    highlights: [
      'Sub-100ms global response times powered by Cloudflare edge workers',
      'Zero-trust cryptographic verification for event feedback and applications',
      'Automated transactional email studio and real-time administrative suite',
    ],
    icon: Sparkles,
    gradient: 'from-purple-500/20 via-pink-500/10 to-transparent',
  },
];

export const AchievementsShowcase: React.FC = () => {
  return (
    <div className="space-y-12 py-6">
      {/* Section Header */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-sky-400 text-xs font-bold uppercase tracking-wider"
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Excellence & Milestones</span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white"
        >
          Club{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-400">
            Achievements
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium"
        >
          Recognizing the dedication, innovation, and industry recognition achieved by Cloud Stack Club and its members across Chandigarh University and beyond.
        </motion.p>
      </div>

      {/* Key Stats Counter Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {STATS.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + idx * 0.05 }}
              className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col items-center text-center space-y-2 hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                {stat.value}
              </span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {stat.label}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Achievements Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ACHIEVEMENTS.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className="group relative rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-xl hover:border-blue-500/30 transition-all duration-300 p-6 flex flex-col justify-between overflow-hidden"
            >
              {/* Subtle Ambient Glow */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}
              />

              <div className="space-y-4 relative z-10">
                {/* Header Row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 dark:bg-slate-800/80 text-blue-700 dark:text-sky-400 border border-blue-200/60 dark:border-slate-700/60">
                    {item.badge}
                  </span>
                </div>

                {/* Title & Category */}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {item.category} {item.date ? `• ${item.date}` : ''}
                  </span>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mt-1 group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
                    {item.title}
                  </h3>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {item.description}
                </p>

                {/* Highlights List */}
                <div className="pt-2 space-y-1.5 border-t border-slate-100 dark:border-slate-800/80">
                  {item.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                      <span className="font-medium">{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
