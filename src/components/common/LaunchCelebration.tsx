import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

// Perfectly matched to Chandigarh University & Cloud Stack Club logos!
const balloonStyles = [
  { id: 'cu-red', color: '#fca5a5', stop1: '#ef4444', stop2: '#991b1b', shadow: 'rgba(239, 68, 68, 0.4)' },
  { id: 'cu-yellow', color: '#fef08a', stop1: '#facc15', stop2: '#a16207', shadow: 'rgba(250, 204, 21, 0.4)' },
  { id: 'csc-blue', color: '#93c5fd', stop1: '#3b82f6', stop2: '#1e40af', shadow: 'rgba(59, 130, 246, 0.4)' },
];

export const LaunchCelebration = () => {
  const [isActive, setIsActive] = useState(true);

  // Generate 20 vibrant party balloons
  const balloons = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => {
      const style = balloonStyles[Math.floor(Math.random() * balloonStyles.length)];
      return {
        uniqueId: i,
        ...style,
        left: Math.random() * 90 + 5,
        drift: (Math.random() - 0.5) * 20,
        duration: Math.random() * 5 + 6, // 6 to 11 seconds
        delay: Math.random() * 1.5, // stagger
        size: Math.random() * 30 + 55, // 55px to 85px (nice and big!)
      };
    });
  }, []);

  useEffect(() => {
    const duration = 6000; // 6 full seconds of real party
    const end = Date.now() + duration;
    
    // Confetti perfectly matched to the university and club colors
    const colors = ['#ef4444', '#facc15', '#3b82f6', '#ffffff'];

    // 1. Massive Party Burst
    confetti({
      particleCount: 250,
      spread: 140,
      startVelocity: 65,
      origin: { y: 0.8 },
      colors,
      zIndex: 9999999,
    });

    // 2. High-energy side cannons
    const interval = setInterval(() => {
      confetti({
        particleCount: 10,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        startVelocity: 70,
        colors,
        zIndex: 9999999,
      });
      confetti({
        particleCount: 10,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        startVelocity: 70,
        colors,
        zIndex: 9999999,
      });

      if (Date.now() > end) {
        clearInterval(interval);
      }
    }, 200);
    
    const timeout = setTimeout(() => {
      setIsActive(false);
    }, 15000); 

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  if (!isActive) return null;

  return createPortal(
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 9999999 }}>
      {/* 3D Latex Balloon Gradients */}
      <svg width="0" height="0" className="absolute">
        <defs>
          {balloonStyles.map(style => (
            <radialGradient key={style.id} id={`grad-${style.id}`} cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9"/>
              <stop offset="15%" stopColor={style.stop1} />
              <stop offset="100%" stopColor={style.stop2} />
            </radialGradient>
          ))}
        </defs>
      </svg>

      <AnimatePresence>
        {isActive && balloons.map((b) => (
          <motion.div
            key={b.uniqueId}
            initial={{ y: '110vh', x: `${b.left}vw` }}
            animate={{ 
              y: '-40vh', 
              x: [`${b.left}vw`, `${b.left + b.drift}vw`, `${b.left - b.drift}vw`, `${b.left}vw`]
            }}
            transition={{ 
              y: { duration: b.duration, delay: b.delay, ease: 'easeOut' },
              x: { duration: b.duration, delay: b.delay, repeat: Infinity, ease: 'easeInOut' }
            }}
            className="absolute top-0"
            style={{ width: b.size, filter: `drop-shadow(0 15px 15px ${b.shadow})` }}
          >
            {/* Highly Realistic Party Balloon */}
            <svg viewBox="0 0 40 90" width="100%" height="100%">
              {/* Curling Party Ribbon (String) */}
              <path 
                d="M 20 48 Q 28 55 20 65 T 20 85" 
                fill="none" 
                stroke={b.color} 
                strokeWidth="1.5" 
                strokeLinecap="round" 
              />
              {/* Balloon Knot */}
              <path 
                d="M 17 48 L 23 48 L 21 51 L 19 51 Z" 
                fill={b.stop2} 
              />
              {/* Classic Plump Balloon Body */}
              <path 
                d="M20 2 C 7 2 2 12 2 24 C 2 38 12 45 18 49 L 20 50 L 22 49 C 28 45 38 38 38 24 C 38 12 33 2 20 2 Z" 
                fill={`url(#grad-${b.id})`} 
              />
              {/* Bright Glossy Reflection */}
              <path 
                d="M 9 16 A 12 12 0 0 1 18 6" 
                stroke="rgba(255,255,255,0.7)" 
                strokeWidth="2.5" 
                fill="none" 
                strokeLinecap="round" 
              />
            </svg>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
};
