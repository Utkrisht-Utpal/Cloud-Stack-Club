import React from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';

export const ScrollProgress: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      data-scroll-progress
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-sky-400 to-cyan-400 z-50 origin-left"
      style={{ scaleX }}
    />
  );
};
