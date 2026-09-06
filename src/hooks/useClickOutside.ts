import { useEffect, type RefObject } from 'react';

export type ClickOutsideRef = RefObject<HTMLElement | null | undefined> | HTMLElement | null | undefined;

export interface UseClickOutsideOptions {
  enabled?: boolean;
  onClose: () => void;
  refs: ClickOutsideRef[];
  closeOnEsc?: boolean;
}

/**
 * Hook to trigger a callback when clicking or touching outside one or more referenced elements.
 * Handles React Portal menus, mobile touch events, iframes (live preview iframe click/blur), and Escape key dismissal.
 */
export function useClickOutside({
  enabled = true,
  onClose,
  refs,
  closeOnEsc = true,
}: UseClickOutsideOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handlePointerOrTouch = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      const isInside = refs.some((ref) => {
        if (!ref) return false;
        const el = typeof ref === 'object' && ref !== null && 'current' in ref ? ref.current : (ref as HTMLElement | null);
        return el ? el.contains(target) : false;
      });

      if (!isInside) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (closeOnEsc && event.key === 'Escape') {
        onClose();
      }
    };

    const handleWindowBlur = () => {
      // When clicking inside an iframe (like the live email preview), window loses focus
      setTimeout(() => {
        onClose();
      }, 0);
    };

    document.addEventListener('mousedown', handlePointerOrTouch, true);
    document.addEventListener('touchstart', handlePointerOrTouch, true);
    window.addEventListener('blur', handleWindowBlur);

    if (closeOnEsc) {
      document.addEventListener('keydown', handleKeyDown, true);
    }

    // Attach listeners directly to any rendered iframes on the page (e.g. Email Live Preview)
    const iframes = Array.from(document.querySelectorAll('iframe'));
    const iframeCleanups: Array<() => void> = [];

    iframes.forEach((iframe) => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.addEventListener('mousedown', onClose, true);
          iframeDoc.addEventListener('touchstart', onClose, true);
          iframeCleanups.push(() => {
            try {
              iframeDoc.removeEventListener('mousedown', onClose, true);
              iframeDoc.removeEventListener('touchstart', onClose, true);
            } catch {}
          });
        }
      } catch {}
    });

    return () => {
      document.removeEventListener('mousedown', handlePointerOrTouch, true);
      document.removeEventListener('touchstart', handlePointerOrTouch, true);
      window.removeEventListener('blur', handleWindowBlur);
      if (closeOnEsc) {
        document.removeEventListener('keydown', handleKeyDown, true);
      }
      iframeCleanups.forEach((cleanup) => cleanup());
    };
  }, [enabled, onClose, closeOnEsc, ...refs]);
}

