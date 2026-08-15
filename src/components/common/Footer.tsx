import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUp, Heart, ShieldCheck } from 'lucide-react';
import { siteConfig } from '../../constants/siteConfig';
import { LinkedinIcon, GithubIcon } from '../ui/SocialIcons';
import { ClubLogo } from '../ui/ClubLogo';
import { CULogo } from '../ui/CULogo';
import { getCoreMembers } from '../../services/members';

export const Footer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [leadership, setLeadership] = useState<{
    faculty: string;
    coFaculty: string;
    secretary: string;
    jointSecretary: string;
  }>({
    faculty: siteConfig.coordinators.faculty,
    coFaculty: siteConfig.coordinators.coFaculty,
    secretary: siteConfig.coordinators.secretary,
    jointSecretary: siteConfig.coordinators.jointSecretary,
  });

  useEffect(() => {
    getCoreMembers()
      .then((members) => {
        if (!members || members.length === 0) return;

        let faculty = siteConfig.coordinators.faculty;
        let coFaculty = siteConfig.coordinators.coFaculty;
        let secretary = siteConfig.coordinators.secretary;
        let jointSecretary = siteConfig.coordinators.jointSecretary;

        members.forEach((m: any) => {
          const roleName = (m.role?.name || '').toLowerCase();

          const isCoFaculty =
            roleName.includes('co-faculty') ||
            roleName.includes('co - faculty') ||
            roleName.includes('co faculty') ||
            roleName.includes('co- advisor') ||
            roleName.includes('co - advisor');

          const isFaculty =
            !isCoFaculty &&
            (roleName.includes('faculty advisor') ||
              roleName.includes('faculty coordinator') ||
              roleName.includes('faculty'));

          const isJointOrVice =
            roleName.includes('joint') ||
            roleName.includes('vice') ||
            roleName.includes('co-head');

          const isSecretaryOrPresident =
            !isJointOrVice &&
            (roleName.includes('secretary') ||
              roleName.includes('president') ||
              roleName.includes('head'));

          if (isCoFaculty) {
            coFaculty = m.name;
          } else if (isFaculty) {
            faculty = m.name;
          } else if (isJointOrVice) {
            jointSecretary = m.name;
          } else if (isSecretaryOrPresident) {
            secretary = m.name;
          }
        });

        setLeadership({
          faculty,
          coFaculty,
          secretary,
          jointSecretary,
        });
      })
      .catch(console.error);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavClick = (href: string, isExternalPage?: boolean) => {
    if (isExternalPage) {
      navigate(href);
      return;
    }
    if (location.pathname !== '/') {
      navigate(href);
      return;
    }
    const targetId = href.replace('/#', '');
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="relative z-10 pt-16 pb-8 border-t border-slate-200 dark:border-slate-800/80 bg-slate-100/50 dark:bg-slate-950/80 text-slate-700 dark:text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-12 pb-12 border-b border-slate-200 dark:border-slate-800/80">
          
          {/* Left Column: CU Logo & Club Logo */}
          <div className="flex flex-col space-y-4">
            <div className="space-y-3">
              <CULogo size="md" />
              <div className="pt-2">
                <ClubLogo size="md" showText={true} />
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm pt-1">
              {siteConfig.tagline}
            </p>
          </div>

          {/* Middle Column: Quick Links */}
          <div className="flex flex-col space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              QUICK LINKS
            </h4>
            <ul className="grid grid-cols-2 gap-2 text-sm font-medium">
              {siteConfig.navLinks.map((link) => (
                <li key={link.name}>
                  <button
                    type="button"
                    onClick={() => handleNavClick(link.href, link.isExternalPage)}
                    className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-sky-400 transition-colors py-1 flex items-center gap-2 cursor-pointer text-left"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500/80 dark:bg-sky-400 shrink-0" />
                    <span className="whitespace-nowrap">{link.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Right Column: Leadership & Coordinators (Strictly 4 Primary Database Roles) */}
          <div className="flex flex-col space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-sky-400" />
              Club Leadership & Faculty
            </h4>
            <div className="space-y-3 text-sm">
              <div className="p-3 rounded-xl glass-panel bg-white/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Faculty Coordinator</p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{leadership.faculty}</p>
              </div>

              <div className="p-3 rounded-xl glass-panel bg-white/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Co-Faculty Coordinator</p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{leadership.coFaculty}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl glass-panel bg-white/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Secretary</p>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{leadership.secretary}</p>
                </div>
                <div className="p-2.5 rounded-xl glass-panel bg-white/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Joint Secretary</p>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{leadership.jointSecretary}</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Footer Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span>© 2026 {siteConfig.name}. All rights reserved. v1.0.20</span>
          </div>

          <div className="flex items-center gap-1">
            <span>Built with</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 animate-pulse inline" />
            <span>by Utkrisht Utpal</span>
          </div>

          {/* Personal Social Icons LinkedIn & GitHub only*/}
          <div className="flex items-center gap-3">
            <motion.a
              whileHover={{ scale: 1.15, y: -2 }}
              href={siteConfig.personalSocials.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl glass-panel text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-sky-400 transition-colors"
              aria-label="LinkedIn Profile"
            >
              <LinkedinIcon className="w-4 h-4" />
            </motion.a>

            <motion.a
              whileHover={{ scale: 1.15, y: -2 }}
              href={siteConfig.personalSocials.github}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl glass-panel text-slate-600 dark:text-slate-300 hover:text-sky-400 transition-colors"
              aria-label="GitHub Profile"
            >
              <GithubIcon className="w-4 h-4" />
            </motion.a>

            <motion.button
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={scrollToTop}
              className="p-2 rounded-xl glass-panel text-blue-600 dark:text-sky-400 hover:bg-blue-500/10 transition-colors ml-2"
              aria-label="Back to Top"
            >
              <ArrowUp className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>
    </footer>
  );
};
