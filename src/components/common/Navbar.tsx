import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Menu, X, ArrowRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { siteConfig } from '../../constants/siteConfig';
import { Button } from '../ui/Button';
import { ClubLogo } from '../ui/ClubLogo';
import { CULogo } from '../ui/CULogo';

interface NavbarProps {
  onOpenJoinModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenJoinModal }) => {
  const { theme, toggleTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const location = useLocation();
  const navigate = useNavigate();

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
        <div className="flex items-center justify-between">
          {/* Left: Club Shield Logo (Image 1) */}
          <Link
            to="/"
            className="flex items-center gap-3 focus:outline-none group cursor-pointer"
            aria-label="Cloud Stack Club Home"
          >
            <ClubLogo size="md" showText={true} />
          </Link>

          {/* Center: Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-[#e6ecf5] dark:bg-slate-900/90 shadow-[4px_4px_12px_rgba(163,177,198,0.5),-4px_-4px_12px_#ffffff] dark:shadow-none dark:border dark:border-slate-800 px-3.5 py-1.5 rounded-full">
            {siteConfig.navLinks.map((link) => {
              const sectionId = link.href.replace('/#', '');
              const isActive =
                link.isExternalPage
                  ? location.pathname === link.href
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

          {/* Right: CU Logo (Image 2) + Theme Toggle + Join Button */}
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

            {/* Join Club Button */}
            <Button
              variant="primary"
              size="sm"
              icon={<ArrowRight className="w-4 h-4" />}
              onClick={onOpenJoinModal}
            >
              Join Club
            </Button>
          </div>

          {/* Mobile Right Controls */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl glass-panel text-slate-700 dark:text-slate-200 cursor-pointer"
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl glass-panel text-slate-900 dark:text-white focus:outline-none cursor-pointer"
              aria-label="Toggle Mobile Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
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
    </header>
  );
};
