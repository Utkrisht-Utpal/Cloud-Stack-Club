import { useEffect } from 'react';
import confetti from 'canvas-confetti';

export const LaunchCelebration = () => {
  useEffect(() => {
    // Run only once per session
    const hasCelebrated = sessionStorage.getItem('csc_launch_celebrated');
    
    if (!hasCelebrated) {
      sessionStorage.setItem('csc_launch_celebrated', 'true');
      
      const duration = 8000; // 8 full seconds of massive celebration
      const end = Date.now() + duration;

      // Expanded vibrant theme colors
      const colors = ['#3b82f6', '#0ea5e9', '#6366f1', '#a855f7', '#ffffff', '#eab308', '#ec4899', '#10b981'];

      // 1. GIGANTIC initial explosion from the center-bottom
      confetti({
        particleCount: 400,
        spread: 160,
        startVelocity: 70,
        origin: { y: 0.9 },
        colors,
        zIndex: 999999,
      });
      
      // Secondary giant explosion from center top
      setTimeout(() => {
        confetti({
          particleCount: 300,
          spread: 360,
          startVelocity: 50,
          origin: { y: 0.3 },
          colors,
          zIndex: 999999,
        });
      }, 500);

      // 2. Continuous massive side cannons & random fireworks
      (function frame() {
        // Huge Left Cannon
        confetti({
          particleCount: 12,
          angle: 60,
          spread: 75,
          origin: { x: -0.05, y: 0.9 },
          startVelocity: 85,
          colors,
          zIndex: 999999,
        });
        
        // Huge Right Cannon
        confetti({
          particleCount: 12,
          angle: 120,
          spread: 75,
          origin: { x: 1.05, y: 0.9 },
          startVelocity: 85,
          colors,
          zIndex: 999999,
        });

        // 3. Random fireworks bursts popping across the top half of the screen
        if (Math.random() < 0.15) {
          confetti({
            particleCount: 60,
            angle: Math.random() * 360,
            spread: 90,
            origin: { x: Math.random(), y: Math.random() * 0.5 },
            startVelocity: 35,
            colors,
            zIndex: 999999,
          });
        }

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());
    }
  }, []);

  return null;
};
