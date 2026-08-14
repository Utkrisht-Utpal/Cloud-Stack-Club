import { lazy, type ComponentType } from 'react';

/**
 * Enhanced lazy loading wrapper that detects Vercel stale chunk 404 errors
 * and automatically hard-reloads the page to load fresh deployed bundles.
 */
export const lazyWithRetry = <T extends ComponentType<any>>(
  componentImport: () => Promise<any>,
  exportName?: string
): ReturnType<typeof lazy<T>> =>
  lazy(async () => {
    const pageHasBeenRefreshed = sessionStorage.getItem('csc_page_force_refreshed');

    try {
      const module = await componentImport();
      sessionStorage.removeItem('csc_page_force_refreshed');
      if (exportName && module[exportName]) {
        return { default: module[exportName] };
      }
      if (module.default) {
        return module;
      }
      return { default: module };
    } catch (error) {
      console.warn('Chunk load error detected. Hard refreshing to load updated assets...', error);
      if (!pageHasBeenRefreshed) {
        sessionStorage.setItem('csc_page_force_refreshed', 'true');
        window.location.reload();
      }
      throw error;
    }
  });
