/**
 * Cloudflare R2 Storage Abstraction Layer
 * Replaces Supabase Storage — all media operations go through the Cloudflare Worker proxy.
 */

const WORKER_URL = import.meta.env.VITE_MEDIA_WORKER_URL || '';
const UPLOAD_SECRET = import.meta.env.VITE_MEDIA_UPLOAD_SECRET || '';
const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL || '';

/**
 * Check if R2 storage is configured
 */
export const isR2Configured = (): boolean => {
  return !!WORKER_URL && !!UPLOAD_SECRET && !!R2_PUBLIC_URL;
};

/**
 * Upload a file to R2 via the Cloudflare Worker proxy.
 * @param folder - Logical folder/bucket name (e.g. 'event-images', 'event-pdfs', 'registration-files')
 * @param path - File path within the folder (e.g. 'posters/abc123_17240123.jpg')
 * @param file - The File object to upload
 * @returns The full public URL of the uploaded file
 */
export const uploadToR2 = async (folder: string, path: string, file: File): Promise<string> => {
  const fullPath = `${folder}/${path}`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('path', fullPath);

  const response = await fetch(`${WORKER_URL}/upload`, {
    method: 'POST',
    headers: {
      'X-Upload-Secret': UPLOAD_SECRET,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error((errorBody as any).error || `R2 upload failed with status ${response.status}`);
  }

  return `${R2_PUBLIC_URL}/${fullPath}`;
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
  if (!WORKER_URL || !UPLOAD_SECRET) {
    console.warn('R2 delete skipped: WORKER_URL or UPLOAD_SECRET not configured.');
    return;
  }

  const path = extractR2Path(fullPathOrUrl);
  if (!path) return;

  const response = await fetch(`${WORKER_URL}/delete`, {
    method: 'DELETE',
    headers: {
      'X-Upload-Secret': UPLOAD_SECRET,
      'Content-Type': 'application/json',
    },
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
  if (!WORKER_URL || !UPLOAD_SECRET || !paths || paths.length === 0) return;

  const relativePaths = paths.map((p) => extractR2Path(p)).filter(Boolean);
  if (relativePaths.length === 0) return;

  const response = await fetch(`${WORKER_URL}/delete`, {
    method: 'DELETE',
    headers: {
      'X-Upload-Secret': UPLOAD_SECRET,
      'Content-Type': 'application/json',
    },
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
    pathOrUrl.startsWith('http://') ||
    pathOrUrl.startsWith('https://') ||
    pathOrUrl.startsWith('data:') ||
    pathOrUrl.startsWith('blob:')
  ) {
    return pathOrUrl;
  }
  // Treat as R2 relative path
  return `${R2_PUBLIC_URL}/${pathOrUrl}`;
};

/** R2 folder constants (matching old Supabase bucket names) */
export const R2_FOLDERS = {
  EVENT_IMAGES: 'event-images',
  EVENT_PDFS: 'event-pdfs',
  REGISTRATION_FILES: 'registration-files',
  GALLERY: 'event-gallery',
} as const;
