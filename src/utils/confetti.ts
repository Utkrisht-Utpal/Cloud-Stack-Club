import confetti from 'canvas-confetti';

/**
 * Triggers an energetic confetti explosion booming from both left and right sides of the screen.
 * Used upon successful individual or team event registrations.
 */
export const triggerRegistrationConfetti = () => {
  const duration = 3200;
  const animationEnd = Date.now() + duration;

  // Vibrant club theme palette
  const colors = [
    '#3b82f6', // Blue
    '#0ea5e9', // Sky
    '#6366f1', // Indigo
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#a855f7', // Purple
    '#ffffff', // White
  ];

  // 1. Initial powerful dual blast from bottom-left and bottom-right edges
  confetti({
    particleCount: 120,
    angle: 60,
    spread: 75,
    origin: { x: 0, y: 0.8 },
    startVelocity: 75,
    colors,
    zIndex: 9999999,
  });

  confetti({
    particleCount: 120,
    angle: 120,
    spread: 75,
    origin: { x: 1, y: 0.8 },
    startVelocity: 75,
    colors,
    zIndex: 9999999,
  });

  // 2. Secondary elevated blast after 350ms
  setTimeout(() => {
    confetti({
      particleCount: 80,
      angle: 55,
      spread: 80,
      origin: { x: 0, y: 0.65 },
      startVelocity: 65,
      colors,
      zIndex: 9999999,
    });

    confetti({
      particleCount: 80,
      angle: 125,
      spread: 80,
      origin: { x: 1, y: 0.65 },
      startVelocity: 65,
      colors,
      zIndex: 9999999,
    });
  }, 350);

  // 3. Continuous rhythmic cannons booming from both sides
  const interval: any = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    const intensity = timeLeft / duration;

    // Left cannon
    confetti({
      particleCount: Math.max(8, Math.floor(25 * intensity)),
      angle: 55 + Math.random() * 15,
      spread: 60,
      origin: { x: 0, y: 0.7 },
      startVelocity: 55 + Math.random() * 20,
      colors,
      zIndex: 9999999,
    });

    // Right cannon
    confetti({
      particleCount: Math.max(8, Math.floor(25 * intensity)),
      angle: 110 + Math.random() * 15,
      spread: 60,
      origin: { x: 1, y: 0.7 },
      startVelocity: 55 + Math.random() * 20,
      colors,
      zIndex: 9999999,
    });
  }, 220);
};
