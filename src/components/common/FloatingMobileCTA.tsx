import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';

interface FloatingMobileCTAProps {
  onJoinClick: () => void;
}

export const FloatingMobileCTA: React.FC<FloatingMobileCTAProps> = ({ onJoinClick }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const heroSection = document.getElementById('hero');
      if (heroSection) {
        const bottom = heroSection.getBoundingClientRect().bottom;
        if (bottom < 0) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
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
