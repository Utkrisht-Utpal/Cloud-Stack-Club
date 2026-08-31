import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';

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
    __turnstileScriptLoading?: boolean;
  }
}

const TURNSTILE_SCRIPT_ID = 'cf-turnstile-script';
const TURNSTILE_SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/**
 * Lazily injects the Cloudflare Turnstile <script> into <head> on first call.
 * Safe to call multiple times — only one script tag will ever be added.
 * Returns a Promise that resolves when window.turnstile is ready.
 */
export const loadTurnstileScript = (): Promise<void> => {
  return new Promise((resolve) => {
    // Already fully loaded
    if (window.turnstile) {
      resolve();
      return;
    }

    // Script tag already in DOM — just wait for it
    if (document.getElementById(TURNSTILE_SCRIPT_ID)) {
      const poll = setInterval(() => {
        if (window.turnstile) {
          clearInterval(poll);
          resolve();
        }
      }, 100);
      return;
    }

    // First time: create the script tag
    const script = document.createElement('script');
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // Poll briefly until window.turnstile is populated
      const poll = setInterval(() => {
        if (window.turnstile) {
          clearInterval(poll);
          resolve();
        }
      }, 50);
    };
    script.onerror = () => resolve(); // Resolve anyway; widget will handle the missing API
    document.head.appendChild(script);
  });
};

/**
 * Global helper to reset any active Turnstile challenge immediately on error.
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

    const handleReset = useCallback(() => {
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
    }, []);

    useImperativeHandle(ref, () => ({
      reset: handleReset,
    }));

    // Trigger reset when resetTrigger prop increments
    useEffect(() => {
      if (resetTrigger !== undefined && resetTrigger > 0) {
        handleReset();
      }
    }, [resetTrigger, handleReset]);

    useEffect(() => {
      if (!siteKey || !containerRef.current) return;

      let isMounted = true;

      const renderWidget = () => {
        if (!isMounted || !containerRef.current || !window.turnstile) return;

        // Clear any previous render in this container
        if (widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {}
          widgetIdRef.current = null;
        }

        try {
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            theme: 'auto',
            appearance: 'interaction-only',
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

      // Load the script lazily (no-op if already loaded), then render
      loadTurnstileScript().then(() => {
        if (isMounted) renderWidget();
      });

      return () => {
        isMounted = false;
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {}
          widgetIdRef.current = null;
        }
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [siteKey]);

    if (!siteKey) return null;

    return (
      <div className={className}>
        <div ref={containerRef} />
      </div>
    );
  }
);

TurnstileWidget.displayName = 'TurnstileWidget';
