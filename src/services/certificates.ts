/**
 * Member Certificates Service
 * Manages certificate showcase images in Supabase PostgreSQL (certificates table)
 * and Cloudflare R2 Storage (certificates/ folder).
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { uploadToR2, deleteFromR2, R2_FOLDERS, resolveMediaUrl, extractR2Path } from '../lib/r2Storage';
import type { Certificate } from '../types/database';

export const LOCAL_STORAGE_CERTIFICATES_KEY = 'csc_certificates_list';
export const MAX_CERTIFICATE_SIZE = 500 * 1024; // 500KB strict limit

/**
 * Fetch all certificates from database (or fallback cache)
 */
export const getCertificates = async (): Promise<Certificate[]> => {
  if (!isSupabaseConfigured()) {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_CERTIFICATES_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }

  try {
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Failed to fetch certificates from Supabase:', error.message);
      const cached = localStorage.getItem(LOCAL_STORAGE_CERTIFICATES_KEY);
      return cached ? JSON.parse(cached) : [];
    }

    const certs: Certificate[] = (data || []).map((row) => ({
      id: row.id,
      image_url: resolveMediaUrl(row.image_url),
      display_order: row.display_order ?? 0,
      created_at: row.created_at,
    }));

    // Cache locally for instant next load
    try {
      localStorage.setItem(LOCAL_STORAGE_CERTIFICATES_KEY, JSON.stringify(certs));
    } catch {}

    return certs;
  } catch (err) {
    console.error('Error in getCertificates:', err);
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_CERTIFICATES_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }
};

/**
 * Upload multiple JPG certificates (max 500KB each) to R2 and save in Supabase
 */
export const uploadCertificates = async (
  files: File[],
  onProgress?: (completed: number, total: number) => void
): Promise<Certificate[]> => {
  if (!files || files.length === 0) return [];

  // 1. Strict validation: 500KB limit and JPG format only
  for (const file of files) {
    const isJpg = file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name);
    if (!isJpg) {
      throw new Error(`File "${file.name}" is not a JPG image. Only JPG/JPEG files are supported.`);
    }

    if (file.size > MAX_CERTIFICATE_SIZE) {
      const sizeKB = (file.size / 1024).toFixed(0);
      throw new Error(
        `Certificate "${file.name}" exceeds the 500KB limit (${sizeKB}KB). Please compress or choose an image under 500KB.`
      );
    }
  }

  const createdCertificates: Certificate[] = [];
  const total = files.length;

  // Get current max display_order to append sequentially
  const existing = await getCertificates();
  let nextOrder = existing.reduce((max, c) => Math.max(max, c.display_order || 0), 0) + 1;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `certificates/${Date.now()}_${i}_${sanitizedName}`;

    // Upload to Cloudflare R2
    const publicUrl = await uploadToR2(R2_FOLDERS.GALLERY, path, file);

    const orderNumber = nextOrder++;

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('certificates')
        .insert({
          image_url: publicUrl,
          display_order: orderNumber,
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error saving certificate record to Supabase:', error);
        throw error;
      }

      if (data) {
        createdCertificates.push({
          id: data.id,
          image_url: resolveMediaUrl(data.image_url),
          display_order: data.display_order ?? orderNumber,
          created_at: data.created_at,
        });
      }
    } else {
      createdCertificates.push({
        id: `mock-cert-${Date.now()}-${i}`,
        image_url: publicUrl,
        display_order: orderNumber,
        created_at: new Date().toISOString(),
      });
    }

    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  // Update local cache
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_CERTIFICATES_KEY);
    const list: Certificate[] = cached ? JSON.parse(cached) : [];
    list.unshift(...createdCertificates);
    localStorage.setItem(LOCAL_STORAGE_CERTIFICATES_KEY, JSON.stringify(list));
  } catch {}

  return createdCertificates;
};

/**
 * Reorder certificates by updating their display_order in Supabase
 */
export const reorderCertificates = async (
  reorderedList: Certificate[]
): Promise<boolean> => {
  try {
    // Optimistically update local cache
    try {
      localStorage.setItem(LOCAL_STORAGE_CERTIFICATES_KEY, JSON.stringify(reorderedList));
    } catch {}

    if (!isSupabaseConfigured()) return true;

    // Persist new display orders in parallel
    const updatePromises = reorderedList.map((cert, index) =>
      supabase
        .from('certificates')
        .update({ display_order: index + 1 })
        .eq('id', cert.id)
    );

    const results = await Promise.all(updatePromises);
    const hasError = results.some((r) => r.error);
    if (hasError) {
      console.warn('Some certificate order updates failed');
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error reordering certificates:', err);
    return false;
  }
};

/**
 * Delete certificate from Supabase and Cloudflare R2
 */
export const deleteCertificate = async (
  id: string,
  imageUrl: string
): Promise<boolean> => {
  try {
    // 1. Delete from Supabase
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('certificates').delete().eq('id', id);
      if (error) {
        console.error('Failed to delete certificate from Supabase:', error);
        throw error;
      }
    }

    // 2. Delete file from R2
    const cleanR2Path = extractR2Path(imageUrl);
    if (cleanR2Path) {
      await deleteFromR2(cleanR2Path).catch((err) => {
        console.warn('R2 file deletion warning for certificate:', err);
      });
    }

    // 3. Update local cache
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_CERTIFICATES_KEY);
      if (cached) {
        const list: Certificate[] = JSON.parse(cached);
        const filtered = list.filter((c) => c.id !== id);
        localStorage.setItem(LOCAL_STORAGE_CERTIFICATES_KEY, JSON.stringify(filtered));
      }
    } catch {}

    return true;
  } catch (err) {
    console.error('Error deleting certificate:', err);
    throw err;
  }
};
