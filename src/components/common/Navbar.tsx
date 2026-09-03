import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Menu, X, ArrowRight, LogOut, ShieldCheck, Bell, Flame, Sparkles, Info, ChevronRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { siteConfig } from '../../constants/siteConfig';
import { Button } from '../ui/Button';
import { ClubLogo } from '../ui/ClubLogo';
import { CULogo } from '../ui/CULogo';
import { getActiveNotices } from '../../services/notices';
import { NoticeDetailModal } from './NoticeDetailModal';
import type { Notice } from '../../types/database';

interface NavbarProps {
  onOpenJoinModal?: () => void;
  isAdminDashboard?: boolean;
  onAdminLogout?: () => void;
  mobileNavOpen?: boolean;
  onToggleMobileNav?: () => void;
}

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 22) return 'Good evening';
  return 'Welcome';
};

export const Navbar: React.FC<NavbarProps> = ({ onOpenJoinModal, isAdminDashboard, onAdminLogout, mobileNavOpen, onToggleMobileNav }) => {
  const { theme, toggleTheme } = useTheme();
  const { openAdminModal, isAdminLoggedIn, setShowDashboard, adminName } = useAdminAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const location = useLocation();
  const navigate = useNavigate();

  const [activeNotice, setActiveNotice] = useState<Notice | null>(() => {
    try {
      const cached = localStorage.getItem('csc_active_notices_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed && parsed.length > 0 ? parsed[0] : null;
      }
    } catch {}
    return null;
  });
  const [isNoticeDetailOpen, setIsNoticeDetailOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchNotice = async () => {
      try {
        const notices = await getActiveNotices();
        if (isMounted) {
          setActiveNotice(notices.length > 0 ? notices[0] : null);
        }
      } catch (err) {
        console.warn('Failed to load active notice:', err);
      }
    };

    fetchNotice();

    const handleUpdate = () => fetchNotice();
    window.addEventListener('csc-notice-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('csc-notice-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const getNoticeStyle = (type?: string) => {
    switch (type) {
      case 'urgent':
        return {
          label: 'Urgent Alert',
          icon: Flame,
          badge: 'bg-red-500 text-white shadow-red-500/30',
        };
      case 'event':
        return {
          label: 'Event Alert',
          icon: Sparkles,
          badge: 'bg-purple-500 text-white shadow-purple-500/30',
        };
      case 'info':
        return {
          label: 'Info',
          icon: Info,
          badge: 'bg-amber-500 text-white shadow-amber-500/30',
        };
      case 'announcement':
      default:
        return {
          label: 'Notice',
          icon: Bell,
          badge: 'bg-blue-600 text-white shadow-blue-500/30',
        };
    }
  };

  const handleAdminClick = () => {
    if (isAdminLoggedIn) {
      setShowDashboard(true);
    } else {
      openAdminModal();
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      if (location.pathname === '/') {
        const sections = ['hero', 'about', 'domains', 'events', 'contact'];
        const scrollPosition = window.scrollY + 200;

        for (const section of sections) {
          const el = document.getElementById(section);
          if (el) {
            const top = el.offsetTop;
            const height = el.offsetHeight;
            if (scrollPosition >= top && scrollPosition < top + height) {
              setActiveSection(section);
              break;
            }
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === '/' && location.hash) {
      const targetId = location.hash.replace('#', '');
      const scrollToSection = () => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
          setActiveSection(targetId);
          return true;
        }
        return false;
      };

      if (!scrollToSection()) {
        const timer = setTimeout(scrollToSection, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [location.pathname, location.hash]);

  const handleNavClick = (href: string, isExternalPage?: boolean) => {
    setMobileMenuOpen(false);

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
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled ? 'glass-nav py-2.5 shadow-xl shadow-blue-500/5' : 'bg-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Hamburger (mobile admin) OR Club Logo (desktop admin / public) */}
          {isAdminDashboard ? (
            <>
              {/* Mobile admin: hamburger icon in the logo slot */}
              <button
                onClick={onToggleMobileNav}
                className="flex md:hidden items-center justify-center w-9 h-9 rounded-xl glass-panel text-slate-700 dark:text-slate-200 cursor-pointer shrink-0"
                aria-label="Toggle navigation menu"
              >
                {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              {/* Desktop admin: show the club logo */}
              <Link
                to="/"
                className="hidden md:flex items-center gap-3 focus:outline-none group cursor-pointer shrink-0"
                aria-label="Cloud Stack Club Home"
              >
                <ClubLogo size="md" showText={true} />
              </Link>
            </>
          ) : (
            <Link
              to="/"
              className="flex items-center gap-3 focus:outline-none group cursor-pointer shrink-0"
              aria-label="Cloud Stack Club Home"
            >
              <ClubLogo size="md" showText={true} />
            </Link>
          )}

          {/* Center: Desktop Navigation Links + Directly Attached Hanging Notice Board OR Admin Dashboard Title */}
          {isAdminDashboard ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-0.5 min-w-0 px-1">
              <h1 className="text-[11px] min-[360px]:text-xs sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap leading-tight">
                Admin Management Dashboard
              </h1>
              {adminName && (
                <p className="text-[10px] sm:text-xs font-semibold text-blue-600 dark:text-sky-400 leading-tight mt-0.5 whitespace-nowrap">
                  {getGreeting()}, <span className="font-bold text-slate-800 dark:text-slate-200">{adminName}</span> 👋
                </p>
              )}
            </div>
          ) : (
            <div className="hidden lg:flex flex-col items-center relative">
              <nav className="relative z-20 flex items-center gap-1 bg-[#e6ecf5] dark:bg-slate-900/90 shadow-[4px_4px_12px_rgba(163,177,198,0.5),-4px_-4px_12px_#ffffff] dark:shadow-none dark:border dark:border-slate-800 px-3.5 py-1.5 rounded-full">
                {siteConfig.navLinks.map((link) => {
                  const sectionId = link.href.replace('/#', '');
                  const isActive =
                    link.isExternalPage
                      ? location.pathname === link.href || (link.href !== '/' && location.pathname.startsWith(link.href))
                      : location.pathname === '/' && activeSection === sectionId;

                  return (
                    <button
                      key={link.name}
                      onClick={() => handleNavClick(link.href, link.isExternalPage)}
                      className={`relative px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-colors rounded-full cursor-pointer ${
                        isActive
                          ? 'text-blue-700 dark:text-sky-400 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {link.name}
                      {isActive && (
                        <motion.div
                          layoutId="activeNavUnderline"
                          className="absolute inset-0 bg-[#dce3f0] dark:bg-sky-400/15 shadow-[inset_2px_2px_5px_rgba(163,177,198,0.5),inset_-2px_-2px_5px_#ffffff] dark:shadow-none rounded-full -z-10"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Hanging Notice Board Directly Suspended Below Navbar (0 Gap) */}
              <AnimatePresence>
                {activeNotice && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    className="absolute top-full z-10 flex flex-col items-center pointer-events-auto"
                  >
                    {/* Hanging Suspension Strings (touching bottom edge of navbar pill with zero gap) */}
                    <div className="flex items-center justify-between w-[82%] max-w-sm sm:max-w-md md:max-w-lg px-4">
                      <div className="w-[1.5px] h-[23px] bg-gradient-to-b from-slate-400/90 via-blue-500/80 to-blue-600 dark:from-slate-500 dark:via-sky-400/80 dark:to-sky-500 shadow-sm" />
                      <div className="w-[1.5px] h-[23px] bg-gradient-to-b from-slate-400/90 via-blue-500/80 to-blue-600 dark:from-slate-500 dark:via-sky-400/80 dark:to-sky-500 shadow-sm" />
                    </div>

                    {/* Notice Board Banner */}
                    {(() => {
                      const style = getNoticeStyle(activeNotice.type);
                      const NoticeIcon = style.icon;
                      return (
                        <button
                          type="button"
                          onClick={() => setIsNoticeDetailOpen(true)}
                          className="group flex items-center gap-2.5 sm:gap-3 px-4 sm:px-6 py-2 rounded-full bg-[#e6ecf5]/98 dark:bg-slate-900/98 backdrop-blur-md shadow-[4px_4px_14px_rgba(163,177,198,0.5),-4px_-4px_14px_#ffffff] dark:shadow-xl dark:shadow-blue-500/15 dark:border dark:border-blue-500/40 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:scale-[1.02] active:scale-98 transition-all cursor-pointer border border-white/80 dark:border-slate-800 max-w-full lg:max-w-3xl xl:max-w-4xl shrink-0 whitespace-nowrap"
                          title="Click to view full notice bulletin"
                        >
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm shrink-0 ${style.badge}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                            <NoticeIcon className="w-3 h-3" />
                            <span>{style.label}</span>
                          </span>

                          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-[220px] sm:max-w-[420px] md:max-w-[560px] lg:max-w-[700px] group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
                            {activeNotice.title}
                          </span>

                          <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-sky-400 shrink-0">
                            <span>{activeNotice.link_text || 'View Details'}</span>
                            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </button>
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Right: CU Logo (Image 2) + Theme Toggle + Admin Login + Join Button — desktop only */}
          <div className="hidden md:flex items-center gap-4">
            <CULogo size="sm" />

            <div className="h-6 w-px bg-slate-300 dark:bg-slate-800" />

            {/* Theme Toggle Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-[#e6ecf5] dark:bg-slate-900 shadow-[3px_3px_8px_rgba(163,177,198,0.5),-3px_-3px_8px_#ffffff] dark:shadow-none dark:border dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-sky-400 transition-colors cursor-pointer"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </motion.button>

            {/* Admin Login Button */}
            {!isAdminDashboard && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAdminClick}
                className="p-2.5 rounded-xl bg-[#e6ecf5] dark:bg-slate-900 shadow-[3px_3px_8px_rgba(163,177,198,0.5),-3px_-3px_8px_#ffffff] dark:shadow-none dark:border dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-sky-400 transition-colors cursor-pointer"
                title={isAdminLoggedIn ? "Admin Panel" : "Admin Login"}
                aria-label={isAdminLoggedIn ? "Admin Panel" : "Admin Login"}
              >
                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-sky-400" />
              </motion.button>
            )}

            {/* Logout (admin) or Join Club (public) */}
            {isAdminDashboard ? (
              <button
                onClick={onAdminLogout}
                className="px-4 py-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                icon={<ArrowRight className="w-4 h-4" />}
                onClick={onOpenJoinModal}
              >
                Join Club
              </Button>
            )}
          </div>

          {/* Mobile Right Controls: theme toggle + icon-only logout (admin) OR hamburger (public) */}
          <div className="flex md:hidden items-center gap-1.5 shrink-0">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl glass-panel text-slate-700 dark:text-slate-200 cursor-pointer"
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {isAdminDashboard ? (
              /* Admin: icon-only logout button */
              <button
                onClick={onAdminLogout}
                className="p-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                aria-label="Logout"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl glass-panel text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                aria-label="Toggle Mobile Menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer — hidden on admin dashboard */}
      {!isAdminDashboard && (
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-b border-slate-300/80 dark:border-slate-800 overflow-hidden bg-[#e6ecf5] dark:bg-slate-950/95 text-slate-900 dark:text-white shadow-xl"
            >
              <div className="px-4 pt-3 pb-6 space-y-2">
                <div className="pb-3 border-b border-slate-300/80 dark:border-slate-800 flex items-center justify-between">
                  <CULogo size="sm" />
                </div>

                {/* Mobile Live Notice Banner */}
                {activeNotice && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setIsNoticeDetailOpen(true);
                    }}
                    className="w-full p-3 rounded-2xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/25 flex items-center gap-2.5 text-left cursor-pointer"
                  >
                    <span className="p-1.5 rounded-xl bg-blue-600 text-white shrink-0 shadow-sm">
                      <Bell className="w-3.5 h-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-sky-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                        Live Club Notice
                      </p>
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate mt-0.5">
                        {activeNotice.title}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                )}

                {siteConfig.navLinks.map((link) => (
                  <button
                    key={link.name}
                    onClick={() => handleNavClick(link.href, link.isExternalPage)}
                    className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-[#dce3f0] dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>{link.name}</span>
                    <ArrowRight className="w-4 h-4 text-slate-500 dark:text-slate-400 opacity-70" />
                  </button>
                ))}

                {!isAdminDashboard && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleAdminClick();
                    }}
                    className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-[#dce3f0] dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                      <span>{isAdminLoggedIn ? 'Admin Management Panel' : 'Admin Login Portal'}</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-500 dark:text-slate-400 opacity-70" />
                  </button>
                )}

                <div className="pt-4 border-t border-slate-300/80 dark:border-slate-800">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full shadow-lg shadow-blue-500/25"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenJoinModal) onOpenJoinModal();
                    }}
                  >
                    Join Cloud Stack Club
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Notice Detail Pop-up Modal */}
      {activeNotice && (
        <NoticeDetailModal
          isOpen={isNoticeDetailOpen}
          onClose={() => setIsNoticeDetailOpen(false)}
          notice={activeNotice}
        />
      )}
    </header>
  );
};
