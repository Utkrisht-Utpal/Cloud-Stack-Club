import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook to manage a ticking submission cooldown timer (e.g. 9 seconds)
 * when a validation error or submission failure occurs, ensuring hidden
 * security checks (Cloudflare Turnstile) have enough time to complete.
 */
export const useSubmitCooldown = (defaultSeconds = 9) => {
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = useCallback((seconds = defaultSeconds) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCooldown(seconds);

    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [defaultSeconds]);

  const resetCooldown = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCooldown(0);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return {
    cooldown,
    isCoolingDown: cooldown > 0,
    startCooldown,
    resetCooldown,
  };
};
