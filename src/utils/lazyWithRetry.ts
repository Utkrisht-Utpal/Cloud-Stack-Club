import { lazy, type ComponentType } from 'react';

/**
 * Enhanced lazy loading wrapper that detects Vercel stale chunk 404 errors
 * and gracefully retries loading before considering a reload.
 */
export const lazyWithRetry = <T extends ComponentType<any>>(
  componentImport: () => Promise<any>,
  exportName?: string
): ReturnType<typeof lazy<T>> =>
  lazy(async () => {
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
    } catch (error: any) {
      console.warn('Chunk load notice, retrying component import...', error);
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const module = await componentImport();
        sessionStorage.removeItem('csc_page_force_refreshed');
        if (exportName && module[exportName]) {
          return { default: module[exportName] };
        }
        return module.default ? module : { default: module };
      } catch (retryErr: any) {
        const errorMsg = String(retryErr?.message || '');
        const isChunk404 =
          errorMsg.includes('Failed to fetch dynamically imported module') ||
          errorMsg.includes('Loading chunk') ||
          errorMsg.includes('error loading dynamically imported module');

        const pageHasBeenRefreshed = sessionStorage.getItem('csc_page_force_refreshed');

        if (isChunk404 && !pageHasBeenRefreshed) {
          sessionStorage.setItem('csc_page_force_refreshed', 'true');
          window.location.reload();
        }
        throw retryErr;
      }
    }
  });
