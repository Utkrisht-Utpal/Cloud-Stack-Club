import { useEffect, useRef, useCallback } from 'react';

/**
 * Manages the `horizontal-scroll-active` class on <html>.
 *
 * When the ScrollProgress component is mounted and its DOM element exists,
 * the class is added to hide the native vertical scrollbar.
 * If the element is removed from the DOM or fails to render, the class is
 * removed so the native scrollbar is automatically restored as a fallback.
 *
 * Uses a MutationObserver to detect runtime removal of the scroll indicator.
 */
export function useScrollbarFallback(scrollProgressSelector: string) {
  const observerRef = useRef<MutationObserver | null>(null);
  const htmlEl = document.documentElement;

  const enableHorizontalMode = useCallback(() => {
    htmlEl.classList.add('horizontal-scroll-active');
  }, [htmlEl]);

  const enableVerticalFallback = useCallback(() => {
    htmlEl.classList.remove('horizontal-scroll-active');
  }, [htmlEl]);

  useEffect(() => {
    // Check if the horizontal scroll indicator is present in the DOM
    const checkScrollIndicator = (): boolean => {
      try {
        const el = document.querySelector(scrollProgressSelector);
        return el !== null && el.isConnected;
      } catch {
        return false;
      }
    };

    // Initial check — give the ScrollProgress component time to mount
    // Use a short delay to allow React to commit the render
    const initTimer = setTimeout(() => {
      if (checkScrollIndicator()) {
        enableHorizontalMode();
      } else {
        enableVerticalFallback();
      }
    }, 100);

    // Observe the document body for child list changes (subtree)
    // to detect if the scroll indicator is removed at runtime
    try {
      observerRef.current = new MutationObserver(() => {
        if (checkScrollIndicator()) {
          enableHorizontalMode();
        } else {
          enableVerticalFallback();
        }
      });

      observerRef.current.observe(document.body, {
        childList: true,
        subtree: true,
      });
    } catch {
      // If MutationObserver fails, keep the vertical scrollbar as fallback
      enableVerticalFallback();
    }

    return () => {
      clearTimeout(initTimer);
      observerRef.current?.disconnect();
      observerRef.current = null;
      // Cleanup: restore vertical scrollbar when the layout unmounts
      enableVerticalFallback();
    };
  }, [scrollProgressSelector, enableHorizontalMode, enableVerticalFallback]);
}
