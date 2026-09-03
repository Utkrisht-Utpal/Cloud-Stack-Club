import React, { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
}

const PARTICLE_COLORS = ['#38bdf8', '#0ea5e9', '#818cf8', '#a855f7', '#e0f2fe'];

export const CustomCursor: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isTextInput, setIsTextInput] = useState(false);

  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const mousePos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const particles = useRef<Particle[]>([]);
  const animFrameId = useRef<number | null>(null);
  const lastSpawnPos = useRef({ x: -100, y: -100 });

  useEffect(() => {
    // Only enable on non-touch devices with fine pointers and no reduced motion preference
    const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!hasFinePointer || prefersReducedMotion) {
      return;
    }

    setEnabled(true);

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (!isVisible) setIsVisible(true);

      // Check distance moved to spawn particles smoothly
      const dx = e.clientX - lastSpawnPos.current.x;
      const dy = e.clientY - lastSpawnPos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 6) {
        lastSpawnPos.current = { x: e.clientX, y: e.clientY };
        spawnParticles(e.clientX, e.clientY, 2);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      setIsClicking(true);
      // Starburst particle burst on click!
      spawnParticles(e.clientX, e.clientY, 8, true);
    };

    const handleMouseUp = () => {
      setIsClicking(false);
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    // Detect hover over interactive elements
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const isInteractive = Boolean(
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="button"]') ||
        target.closest('.cursor-pointer') ||
        target.closest('select') ||
        target.classList.contains('cursor-pointer')
      );

      const isText = Boolean(
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );

      setIsHovering(isInteractive && !isText);
      setIsTextInput(isText);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown, { passive: true });
    window.addEventListener('mouseup', handleMouseUp, { passive: true });
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseover', handleMouseOver, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseover', handleMouseOver);
    };
  }, [isVisible]);

  // Particle Spawner
  const spawnParticles = (x: number, y: number, count: number, isBurst = false) => {
    // Cap maximum active particles for consistent 120 FPS performance
    if (particles.current.length > 60) return;

    for (let i = 0; i < count; i++) {
      const angle = isBurst ? Math.random() * Math.PI * 2 : Math.random() * Math.PI * 2;
      const speed = isBurst ? Math.random() * 2.5 + 1.2 : Math.random() * 0.8 + 0.3;
      const color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];

      particles.current.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (isBurst ? 0 : 0.4), // Subtle upward float
        size: Math.random() * 2.5 + 1.2,
        color,
        alpha: 1,
        decay: Math.random() * 0.03 + 0.025,
      });
    }
  };

  // Canvas Resize & Animation Loop
  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      // 1. Lerp trailing ring
      const ease = 0.22;
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * ease;
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * ease;

      // 2. Update DOM positions
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mousePos.current.x}px, ${mousePos.current.y}px, 0) translate(-50%, -50%)`;
      }

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0) translate(-50%, -50%)`;
      }

      // 3. Clear canvas & render particles
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.current.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.color;
        ctx.fill();
      }

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      {/* Background Particle Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-[99998]"
      />

      {/* Trailing Dashed Cosmic Ring */}
      <div
        ref={ringRef}
        className={`fixed top-0 left-0 pointer-events-none rounded-full z-[99999] transition-all duration-200 ease-out ${
          !isVisible || isTextInput ? 'opacity-0 scale-50' : 'opacity-100'
        } ${
          isClicking
            ? 'w-5 h-5 border-2 border-sky-400 bg-sky-400/20 shadow-[0_0_12px_rgba(56,189,248,0.5)]'
            : isHovering
              ? 'w-10 h-10 border border-sky-400/80 bg-sky-400/10 shadow-[0_0_15px_rgba(56,189,248,0.35)] scale-110'
              : 'w-6 h-6 border border-dashed border-sky-400/40 bg-transparent'
        }`}
        style={{ willChange: 'transform' }}
      />

      {/* Central Precision Glowing Dot */}
      <div
        ref={dotRef}
        className={`fixed top-0 left-0 pointer-events-none rounded-full z-[99999] transition-opacity duration-150 ${
          !isVisible || isTextInput ? 'opacity-0' : 'opacity-100'
        } ${
          isHovering
            ? 'w-2 h-2 bg-white shadow-[0_0_10px_#ffffff]'
            : 'w-1.5 h-1.5 bg-sky-400 shadow-[0_0_8px_#38bdf8]'
        }`}
        style={{ willChange: 'transform' }}
      />
    </>
  );
};
