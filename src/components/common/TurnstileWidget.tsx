import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

export interface TurnstileWidgetRef {
  reset: () => void;
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  className?: string;
  resetTrigger?: number;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact' | 'flexible';
          appearance?: 'always' | 'execute' | 'interaction-only';
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

/**
 * Global helper to reset any active Turnstile challenge immediately on error
 */
export const resetTurnstile = (widgetId?: string) => {
  if (typeof window !== 'undefined' && window.turnstile) {
    try {
      if (widgetId) {
        window.turnstile.reset(widgetId);
      } else {
        window.turnstile.reset();
      }
    } catch (err) {
      console.warn('Turnstile reset notice:', err);
    }
  }
};

export const TurnstileWidget = forwardRef<TurnstileWidgetRef, TurnstileWidgetProps>(
  ({ onVerify, onExpire, className = 'my-3 flex justify-center', resetTrigger }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

    const handleReset = () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch (err) {
          console.warn('Turnstile reset notice:', err);
        }
      } else if (window.turnstile) {
        try {
          window.turnstile.reset();
        } catch {}
      }
    };

    useImperativeHandle(ref, () => ({
      reset: handleReset,
    }));

    // Trigger reset when resetTrigger prop increments
    useEffect(() => {
      if (resetTrigger !== undefined && resetTrigger > 0) {
        handleReset();
      }
    }, [resetTrigger]);

    useEffect(() => {
      if (!siteKey || !containerRef.current) return;

      let isMounted = true;
      let checkInterval: ReturnType<typeof setInterval>;

      const renderWidget = () => {
        if (!isMounted || !containerRef.current || !window.turnstile) return;

        // Clear any previous render
        if (widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {}
        }

        try {
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            theme: 'auto',
            appearance: 'always',
            callback: (token: string) => {
              if (isMounted) onVerify(token);
            },
            'expired-callback': () => {
              if (isMounted && onExpire) onExpire();
            },
            'error-callback': () => {
              console.warn('Cloudflare Turnstile challenge notice.');
            },
          });
        } catch (err) {
          console.warn('Turnstile render notice:', err);
        }
      };

      if (window.turnstile) {
        renderWidget();
      } else {
        // Poll until Turnstile script loads
        let attempts = 0;
        checkInterval = setInterval(() => {
          attempts++;
          if (window.turnstile) {
            clearInterval(checkInterval);
            renderWidget();
          } else if (attempts > 20) {
            clearInterval(checkInterval);
          }
        }, 250);
      }

      return () => {
        isMounted = false;
        if (checkInterval) clearInterval(checkInterval);
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {}
        }
      };
    }, [siteKey]);

    if (!siteKey) return null;

    return (
      <div className={className}>
        <div ref={containerRef} className="min-h-[65px] flex items-center justify-center" />
      </div>
    );
  }
);

TurnstileWidget.displayName = 'TurnstileWidget';
