import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';

interface FloatingMobileCTAProps {
  onJoinClick: () => void;
}

export const FloatingMobileCTA: React.FC<FloatingMobileCTAProps> = ({ onJoinClick }) => {
  const [pastHero, setPastHero] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Show CTA once the hero scrolls out of view
  useEffect(() => {
    const handleScroll = () => {
      const hero = document.getElementById('hero');
      if (hero) {
        setPastHero(hero.getBoundingClientRect().bottom < 0);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hide CTA as soon as the footer enters the viewport
  useEffect(() => {
    const footer = document.querySelector('footer');
    if (!footer) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { threshold: 0 } // fires the moment any pixel of the footer is visible
    );
    observerRef.current.observe(footer);

    return () => observerRef.current?.disconnect();
  }, []);

  const isVisible = pastHero && !footerVisible;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.25 }}
          className="fixed bottom-4 left-4 right-4 z-40 md:hidden"
        >
          <div className="p-3 rounded-2xl glass-panel bg-slate-900/90 border-blue-500/30 shadow-2xl flex items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-2 pl-2">
              <Sparkles className="w-5 h-5 text-sky-400 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-xs font-bold">Cloud Stack Club</span>
                <span className="text-[10px] text-slate-400">Empowering student builders</span>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<ArrowRight className="w-4 h-4" />}
              onClick={onJoinClick}
              className="shrink-0"
            >
              Join Now
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
