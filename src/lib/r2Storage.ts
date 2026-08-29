/**
 * Cloudflare R2 Storage Abstraction Layer
 * Replaces Supabase Storage — all media operations go through the Cloudflare Worker proxy.
 */

const WORKER_URL = import.meta.env.VITE_MEDIA_WORKER_URL || '';
const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL || '';

/**
 * Check if R2 storage is configured
 */
export const isR2Configured = (): boolean => {
  return !!WORKER_URL && !!R2_PUBLIC_URL;
};

/**
 * Upload a file to R2 via the Cloudflare Worker proxy.
 * @param folder - Logical folder/bucket name (e.g. 'event-images', 'event-pdfs', 'registration-files')
 * @param path - File path within the folder (e.g. 'posters/abc123_17240123.jpg')
 * @param file - The File object to upload
 * @returns The full public URL of the uploaded file
 */
import { supabase } from './supabase';

export const uploadToR2 = async (
  folder: string,
  path: string,
  file: File,
  turnstileToken?: string
): Promise<string> => {
  const fullPath = `${folder}/${path}`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('path', fullPath);
  formData.append('folder', folder);
  if (turnstileToken) {
    formData.append('turnstile_token', turnstileToken);
  }

  // Attach active Supabase Admin JWT if user is logged in
  const headers: Record<string, string> = {};
  if (turnstileToken) {
    headers['cf-turnstile-response'] = turnstileToken;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch {}

  const response = await fetch(`${WORKER_URL}/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error((errorBody as any).error || `R2 upload failed with status ${response.status}`);
  }

  const result = await response.json().catch(() => ({}));
  const finalPath = result.path || fullPath;
  return `${R2_PUBLIC_URL}/${finalPath}`;
};

/**
 * Extract clean R2 object key from a full public URL or relative path.
 */
export const extractR2Path = (fullPathOrUrl: string): string => {
  if (!fullPathOrUrl) return '';
  let clean = fullPathOrUrl.trim();

  // If full URL with protocol (e.g. https://pub-xxx.r2.dev/event-gallery/...)
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    try {
      const parsed = new URL(clean);
      clean = decodeURIComponent(parsed.pathname).replace(/^\/+/, '');
    } catch {
      if (R2_PUBLIC_URL && clean.startsWith(R2_PUBLIC_URL)) {
        clean = clean.replace(R2_PUBLIC_URL, '').replace(/^\/+/, '');
      }
    }
  } else if (R2_PUBLIC_URL && clean.startsWith(R2_PUBLIC_URL)) {
    clean = clean.replace(R2_PUBLIC_URL, '').replace(/^\/+/, '');
  }

  return clean.replace(/^\/+/, '');
};

/**
 * Delete a file from R2 via the Cloudflare Worker proxy.
 * @param fullPathOrUrl - Either a full R2 public URL or a relative path
 */
export const deleteFromR2 = async (fullPathOrUrl: string): Promise<void> => {
  if (!WORKER_URL) {
    console.warn('R2 delete skipped: WORKER_URL not configured.');
    return;
  }

  const path = extractR2Path(fullPathOrUrl);
  if (!path) return;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch {}

  const response = await fetch(`${WORKER_URL}/delete`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ path }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unknown error');
    console.warn(`R2 delete warning for ${path}:`, errorText);
  }
};

/**
 * Bulk delete files from R2.
 * @param paths - Array of relative paths or full URLs
 */
export const bulkDeleteFromR2 = async (paths: string[]): Promise<void> => {
  if (!WORKER_URL || !paths || paths.length === 0) return;

  const relativePaths = paths.map((p) => extractR2Path(p)).filter(Boolean);
  if (relativePaths.length === 0) return;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch {}

  const response = await fetch(`${WORKER_URL}/delete`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ paths: relativePaths }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unknown error');
    console.warn('R2 bulk delete warning:', errorText);
  }
};

/**
 * Get the public URL for a file stored in R2.
 * If the input is already a full URL (http/https/data/blob), returns it as-is.
 * @param folder - Logical folder name (e.g. 'event-images')
 * @param path - Relative path within the folder
 */
export const getR2PublicUrl = (folder: string, path: string): string => {
  return `${R2_PUBLIC_URL}/${folder}/${path}`;
};

/**
 * Resolve a stored path or URL to a viewable public URL.
 * Handles: full URLs (pass-through), data URIs (pass-through), relative R2 paths (construct URL).
 */
export const resolveMediaUrl = (pathOrUrl: string | null): string => {
  if (!pathOrUrl) return '';

  if (
    pathOrUrl.startsWith('data:') ||
    pathOrUrl.startsWith('blob:')
  ) {
    return pathOrUrl;
  }

  // If already an R2 URL (or old R2 URL), extract the object key and route through active R2_PUBLIC_URL
  if (pathOrUrl.includes('.r2.dev/')) {
    const key = pathOrUrl.split('.r2.dev/')[1];
    if (key) {
      return R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${key.replace(/^\/+/, '')}` : pathOrUrl;
    }
  }

  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }

  // Normalize leading slash and deduplicate registration-files/ if already present
  let normalized = pathOrUrl.replace(/^\/+/, '');
  if (normalized.startsWith('registration-files/registration-files/')) {
    normalized = normalized.replace(/^registration-files\//, '');
  }

  const encodedPath = normalized
    .split('/')
    .map((segment) => (segment.includes('%') ? segment : encodeURIComponent(segment)))
    .join('/');

  return R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${encodedPath}` : `/${encodedPath}`;
};

/** R2 folder constants (matching old Supabase bucket names) */
export const R2_FOLDERS = {
  EVENT_IMAGES: 'event-images',
  EVENT_PDFS: 'event-pdfs',
  REGISTRATION_FILES: 'registration-files',
  GALLERY: 'event-gallery',
} as const;
