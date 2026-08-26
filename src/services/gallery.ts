/**
 * Event Gallery Service
 * Connects Supabase PostgreSQL (event_gallery table) and Cloudflare R2 Storage (event-gallery folder).
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { uploadToR2, deleteFromR2, bulkDeleteFromR2, R2_FOLDERS, resolveMediaUrl } from '../lib/r2Storage';
import { getEvents } from './events';
import type { GalleryPhoto, Event, EventWithGallery } from '../types/database';

const LOCAL_STORAGE_GALLERY_KEY = 'csc_event_gallery_list';

/**
 * Fetch all gallery photos from database (or fallback cache)
 */
export const getGalleryPhotos = async (): Promise<GalleryPhoto[]> => {
  if (!isSupabaseConfigured()) {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_GALLERY_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }

  try {
    const { data, error } = await supabase
      .from('event_gallery')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Failed to fetch event gallery from Supabase:', error.message);
      const cached = localStorage.getItem(LOCAL_STORAGE_GALLERY_KEY);
      return cached ? JSON.parse(cached) : [];
    }

    const photos: GalleryPhoto[] = (data || []).map((row) => ({
      id: row.id,
      event_id: row.event_id,
      image_url: resolveMediaUrl(row.image_url),
      caption: row.caption,
      display_order: row.display_order ?? 0,
      created_at: row.created_at,
    }));

    // Cache locally for instant next load
    try {
      localStorage.setItem(LOCAL_STORAGE_GALLERY_KEY, JSON.stringify(photos));
    } catch {}

    return photos;
  } catch (err) {
    console.error('Error in getGalleryPhotos:', err);
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_GALLERY_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }
};

/**
 * Fetch photos for a specific event
 */
export const getGalleryPhotosByEvent = async (eventId: string): Promise<GalleryPhoto[]> => {
  const allPhotos = await getGalleryPhotos();
  return allPhotos.filter((p) => p.event_id === eventId);
};

/**
 * Get events that have gallery photos, grouped with their photos
 */
export const getGalleryGroupedByEvent = async (): Promise<EventWithGallery[]> => {
  try {
    const [allEvents, allPhotos] = await Promise.all([
      getEvents(),
      getGalleryPhotos(),
    ]);

    const photosByEventId = new Map<string, GalleryPhoto[]>();
    for (const photo of allPhotos) {
      const list = photosByEventId.get(photo.event_id) || [];
      list.push(photo);
      photosByEventId.set(photo.event_id, list);
    }

    const grouped: EventWithGallery[] = [];

    // Map through events that have photos
    for (const event of allEvents) {
      const photos = photosByEventId.get(event.id);
      if (photos && photos.length > 0) {
        // Link event object to each photo
        const photosWithEvent = photos.map((p) => ({ ...p, event }));
        grouped.push({
          ...event,
          photos: photosWithEvent,
        });
        photosByEventId.delete(event.id);
      }
    }

    // Handle any orphaned photos whose event may not exist in active events
    for (const [eventId, photos] of photosByEventId.entries()) {
      if (photos.length > 0) {
        const dummyEvent: Event = {
          id: eventId,
          title: 'Club Event Showcase',
          slug: 'event-showcase',
          description: 'Moments and highlights from Cloud Stack Club activities.',
          date: photos[0]?.created_at ? photos[0].created_at.split('T')[0] : null,
          start_time: null,
          end_time: null,
          location: 'Chandigarh University',
          image_url: null,
          pdf_url: null,
          status: 'completed',
          registration_enabled: false,
          registration_start: null,
          registration_end: null,
          supports_teams: false,
          max_team_size: null,
          max_registrations: null,
          created_at: photos[0]?.created_at || new Date().toISOString(),
          updated_at: photos[0]?.created_at || new Date().toISOString(),
        };
        grouped.push({
          ...dummyEvent,
          photos: photos.map((p) => ({ ...p, event: dummyEvent })),
        });
      }
    }

    return grouped;
  } catch (err) {
    console.error('Error grouping gallery by event:', err);
    return [];
  }
};

/**
 * Upload multiple photos to Cloudflare R2 and save their metadata in Supabase
 */
export const uploadGalleryPhotos = async (
  eventId: string,
  files: File[],
  defaultCaption?: string,
  onProgress?: (completed: number, total: number) => void
): Promise<GalleryPhoto[]> => {
  if (!eventId) throw new Error('Event ID is required for gallery upload.');
  if (!files || files.length === 0) return [];

  const createdPhotos: GalleryPhoto[] = [];
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${eventId}/${Date.now()}_${i}_${sanitizedName}`;

    // 1. Upload to Cloudflare R2 in dedicated event-gallery folder
    const publicUrl = await uploadToR2(R2_FOLDERS.GALLERY, path, file);

    // 2. Insert record into Supabase event_gallery table
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('event_gallery')
        .insert({
          event_id: eventId,
          image_url: publicUrl,
          caption: defaultCaption?.trim() || null,
          display_order: i + 1,
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error saving photo record to Supabase:', error);
        throw error;
      }

      if (data) {
        createdPhotos.push({
          id: data.id,
          event_id: data.event_id,
          image_url: resolveMediaUrl(data.image_url),
          caption: data.caption,
          display_order: data.display_order ?? 0,
          created_at: data.created_at,
        });
      }
    } else {
      // Local fallback mock ID
      createdPhotos.push({
        id: `mock-photo-${Date.now()}-${i}`,
        event_id: eventId,
        image_url: publicUrl,
        caption: defaultCaption?.trim() || null,
        display_order: i + 1,
        created_at: new Date().toISOString(),
      });
    }

    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  // Update local cache
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_GALLERY_KEY);
    const list: GalleryPhoto[] = cached ? JSON.parse(cached) : [];
    list.unshift(...createdPhotos);
    localStorage.setItem(LOCAL_STORAGE_GALLERY_KEY, JSON.stringify(list));
  } catch {}

  return createdPhotos;
};

/**
 * Update photo caption or display order
 */
export const updateGalleryPhoto = async (
  id: string,
  updates: { caption?: string | null; display_order?: number }
): Promise<GalleryPhoto> => {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('event_gallery')
      .update({
        ...(updates.caption !== undefined ? { caption: updates.caption?.trim() || null } : {}),
        ...(updates.display_order !== undefined ? { display_order: updates.display_order } : {}),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating gallery photo:', error);
      throw error;
    }

    const updated: GalleryPhoto = {
      id: data.id,
      event_id: data.event_id,
      image_url: resolveMediaUrl(data.image_url),
      caption: data.caption,
      display_order: data.display_order ?? 0,
      created_at: data.created_at,
    };

    // Update local cache
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_GALLERY_KEY);
      if (cached) {
        const list: GalleryPhoto[] = JSON.parse(cached);
        const idx = list.findIndex((p) => p.id === id);
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...updated };
          localStorage.setItem(LOCAL_STORAGE_GALLERY_KEY, JSON.stringify(list));
        }
      }
    } catch {}

    return updated;
  }

  throw new Error('Supabase is not configured.');
};

/**
 * Delete a photo from database and remove image file from Cloudflare R2
 */
export const deleteGalleryPhoto = async (id: string, imageUrl: string): Promise<void> => {
  // 1. Delete from database
  if (isSupabaseConfigured()) {
    const { error } = await supabase
      .from('event_gallery')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting photo from Supabase:', error);
      throw error;
    }
  }

  // 2. Delete from Cloudflare R2 bucket
  if (imageUrl) {
    try {
      await deleteFromR2(imageUrl);
    } catch (e) {
      console.warn('Warning: Could not remove photo from R2:', e);
    }
  }

  // 3. Update local cache
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_GALLERY_KEY);
    if (cached) {
      const list: GalleryPhoto[] = JSON.parse(cached);
      const filtered = list.filter((p) => p.id !== id);
      localStorage.setItem(LOCAL_STORAGE_GALLERY_KEY, JSON.stringify(filtered));
    }
  } catch {}
};

/**
 * Bulk delete photos for an event or selected photos
 */
export const bulkDeleteGalleryPhotos = async (photos: { id: string; image_url: string }[]): Promise<void> => {
  if (!photos || photos.length === 0) return;

  const ids = photos.map((p) => p.id);
  const urls = photos.map((p) => p.image_url).filter(Boolean);

  // 1. Delete rows from database
  if (isSupabaseConfigured()) {
    const { error } = await supabase
      .from('event_gallery')
      .delete()
      .in('id', ids);

    if (error) {
      console.error('Error bulk deleting from Supabase:', error);
      throw error;
    }
  }

  // 2. Bulk delete from Cloudflare R2
  if (urls.length > 0) {
    try {
      await bulkDeleteFromR2(urls);
    } catch (e) {
      console.warn('Warning: Could not bulk remove photos from R2:', e);
    }
  }

  // 3. Update local cache
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_GALLERY_KEY);
    if (cached) {
      const list: GalleryPhoto[] = JSON.parse(cached);
      const idSet = new Set(ids);
      const filtered = list.filter((p) => !idSet.has(p.id));
      localStorage.setItem(LOCAL_STORAGE_GALLERY_KEY, JSON.stringify(filtered));
    }
  } catch {}
};
