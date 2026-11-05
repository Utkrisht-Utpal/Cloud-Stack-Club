import confetti from 'canvas-confetti';

/**
 * Triggers an authentic golden Diwali sky fireworks celebration
 */
export const triggerDiwaliFireworks = () => {
  const duration = 2.8 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 35, spread: 360, ticks: 70, zIndex: 999999 };

  const randomInRange = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  // 1. Initial celebratory center burst
  confetti({
    particleCount: 80,
    spread: 100,
    origin: { y: 0.6 },
    colors: ['#fbbf24', '#f59e0b', '#f97316', '#ef4444', '#10b981', '#fef08a', '#ffffff'],
    zIndex: 999999,
  });

  // 2. Continuous multi-point sky rocket bursts
  const interval: ReturnType<typeof setInterval> = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 45 * (timeLeft / duration);
    const colors = ['#fbbf24', '#f59e0b', '#ea580c', '#f43f5e', '#10b981', '#38bdf8', '#ffffff'];

    // Left sky burst
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.15, 0.45), y: Math.random() * 0.4 + 0.1 },
      colors,
    });

    // Right sky burst
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.55, 0.85), y: Math.random() * 0.4 + 0.1 },
      colors,
    });
  }, 220);
};
