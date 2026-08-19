import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { uploadToR2, deleteFromR2, resolveMediaUrl, isR2Configured, R2_FOLDERS } from '../lib/r2Storage';
import { generateUUID } from '../utils/uuid';
import type { Event } from '../types/database';

const CUSTOM_EVENTS_KEY = 'csc_custom_events_list';

const getLocalCustomEvents = (): Event[] => {
  try {
    const stored = localStorage.getItem(CUSTOM_EVENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveLocalCustomEvent = (event: Event): void => {
  try {
    const list = getLocalCustomEvents();
    const filtered = list.filter((e) => e.id !== event.id);
    filtered.unshift(event);
    localStorage.setItem(CUSTOM_EVENTS_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn('Could not save custom event locally:', err);
  }
};

const removeLocalCustomEvent = (eventId: string): void => {
  try {
    const list = getLocalCustomEvents();
    const filtered = list.filter((e) => e.id !== eventId);
    localStorage.setItem(CUSTOM_EVENTS_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn('Could not remove custom event locally:', err);
  }
};

const CATEGORY_MAP_KEY = 'csc_event_categories_map';

export const getStoredCategoriesMap = (): Record<string, string> => {
  try {
    const data = localStorage.getItem(CATEGORY_MAP_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

export const saveStoredCategory = (eventId: string, category: string | null) => {
  try {
    const map = getStoredCategoriesMap();
    if (category && category.trim()) {
      map[eventId] = category.trim();
    } else {
      delete map[eventId];
    }
    localStorage.setItem(CATEGORY_MAP_KEY, JSON.stringify(map));
  } catch {}
};

export const autoSyncEventStatuses = async (eventsList: Event[]) => {
  if (!isSupabaseConfigured() || !eventsList || eventsList.length === 0) return;

  // Use LOCAL date (not UTC) so status transitions happen at local midnight, not UTC midnight
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const nowMs = Date.now();

  for (const evt of eventsList) {
    if (evt.status === 'cancelled') continue;

    let needsUpdate = false;
    const updates: Partial<Event> = {};

    // 1. If event date is TODAY -> update DB status to 'live' (Ongoing)
    if (evt.date && evt.date.split('T')[0] === todayStr && evt.status !== 'live') {
      updates.status = 'live';
      evt.status = 'live';
      needsUpdate = true;
    }
    // 2. If event date is in PAST -> update DB status to 'completed' & disable registration
    else if (evt.date && evt.date.split('T')[0] < todayStr && evt.status !== 'completed') {
      updates.status = 'completed';
      updates.registration_enabled = false;
      evt.status = 'completed';
      evt.registration_enabled = false;
      needsUpdate = true;
    }

    // 3. If registration_end deadline has passed -> update DB registration_enabled to false
    if (evt.registration_end && evt.registration_enabled) {
      const regEndMs = new Date(evt.registration_end).setHours(23, 59, 59, 999);
      if (regEndMs < nowMs) {
        updates.registration_enabled = false;
        evt.registration_enabled = false;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      updates.updated_at = new Date().toISOString();
      try {
        await supabase
          .from('events')
          .update(updates)
          .eq('id', evt.id);
      } catch (err: any) {
        console.warn('Background auto event status sync notice:', err);
      }
    }
  }
};

export const sortEventsByRelevance = (eventsList: Event[]): Event[] => {
  if (!eventsList || eventsList.length === 0) return [];

  // Use LOCAL date (not UTC) so sorting matches local midnight transition
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return [...eventsList].sort((a, b) => {
      const aDateStr = a.date ? a.date.split('T')[0] : '';
      const bDateStr = b.date ? b.date.split('T')[0] : '';

      const aIsPast = aDateStr ? aDateStr < todayStr : false;
      const bIsPast = bDateStr ? bDateStr < todayStr : false;

      // Active / Upcoming events come BEFORE Completed / Past events
      if (!aIsPast && bIsPast) return -1;
      if (aIsPast && !bIsPast) return 1;

      // If both are Active (Today or Future), sort ascending (nearest future event first)
      if (!aIsPast && !bIsPast) {
        if (!aDateStr) return 1;
        if (!bDateStr) return -1;
        return aDateStr.localeCompare(bDateStr);
      }

      // If both are Past/Completed, sort descending (most recent completed event first)
      if (!aDateStr) return 1;
      if (!bDateStr) return -1;
      return bDateStr.localeCompare(aDateStr);
    });
};

export const getEvents = async (): Promise<Event[]> => {
  if (!isSupabaseConfigured()) {
    const localEvents = getLocalCustomEvents();
    autoSyncEventStatuses(localEvents);
    return sortEventsByRelevance(localEvents);
  }

  try {
    // 15000ms Timeout Race for Supabase fetch (allows existing large base64 events to finish loading)
    const fetchPromise = supabase
      .from('events')
      .select('id, title, category, description, date, start_time, location, image_url, pdf_url, status, registration_enabled, registration_start, registration_end, supports_teams, max_team_size, max_registrations, created_at, updated_at')
      .neq('status', 'cancelled')
      .order('date', { ascending: true });

    const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: 'Database fetch timeout' } }), 15000)
    );

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

    if (error || !data) {
      if (error) console.warn('Supabase DB fetch notice:', error.message);
      const localEvents = getLocalCustomEvents();
      return sortEventsByRelevance(localEvents);
    }

    const dbEvents = (data as Event[]) || [];
    const catMap = getStoredCategoriesMap();
    const eventsWithCat = dbEvents.map((e) => ({
      ...e,
      category: e.category || catMap[e.id] || null,
    }));

    // Background non-blocking status sync (0ms load time optimization)
    autoSyncEventStatuses(eventsWithCat).catch(() => {});

    // Save to local storage for instant cached hydration on next visit
    try {
      localStorage.setItem(CUSTOM_EVENTS_KEY, JSON.stringify(eventsWithCat));
    } catch {}

    return sortEventsByRelevance(eventsWithCat);
  } catch {
    const localEvents = getLocalCustomEvents();
    return sortEventsByRelevance(localEvents);
  }
};

export const getEventPdfViewerUrl = (pdfPathOrUrl: string | null): string => {
  if (!pdfPathOrUrl) return '';
  return resolveMediaUrl(pdfPathOrUrl);
};

export const uploadEventPdf = async (file: File, eventId: string): Promise<string> => {
  // Upload to Cloudflare R2 via Worker proxy
  if (isR2Configured()) {
    try {
      const fileExt = file.name.split('.').pop() || 'pdf';
      const filePath = `schedules/${eventId}_${Date.now()}.${fileExt}`;
      const publicUrl = await uploadToR2(R2_FOLDERS.EVENT_PDFS, filePath, file);
      return publicUrl;
    } catch (err) {
      console.warn('R2 PDF upload exception:', err);
    }
  }

  // Fallback: Only convert to base64 if small (<500KB) to prevent breaking DB payload limits
  if (file.size > 500 * 1024) {
    console.warn('PDF file is larger than 500KB and storage upload failed. Skipping base64 fallback to protect database payload limit.');
    return '';
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve((reader.result as string) || '');
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

export const uploadEventImage = async (file: File, eventId: string): Promise<string> => {
  // Upload to Cloudflare R2 via Worker proxy
  if (isR2Configured()) {
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const filePath = `posters/${eventId}_${Date.now()}.${fileExt}`;
      const publicUrl = await uploadToR2(R2_FOLDERS.EVENT_IMAGES, filePath, file);
      return publicUrl;
    } catch (err) {
      console.warn('R2 image upload exception:', err);
    }
  }

  // Fallback: Compress image via Canvas to <50KB max base64 size (prevents 7MB DB bloat)
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 800; // max dimension 800px

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7)); // 70% quality JPEG compression (~40KB)
        } else {
          resolve((e.target?.result as string) || '');
        }
      };
      img.onerror = () => resolve((e.target?.result as string) || '');
      img.src = (e.target?.result as string) || '';
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

export const createEvent = async (eventPayload: Partial<Event>): Promise<Event> => {
  const eventId = eventPayload.id || generateUUID();
  const createdEvent: Event = {
    id: eventId,
    title: eventPayload.title || 'New Event',
    slug: eventPayload.slug || `event-${Date.now()}`,
    description: eventPayload.description || null,
    date: eventPayload.date || new Date().toISOString().split('T')[0],
    start_time: eventPayload.start_time || null,
    end_time: eventPayload.end_time || null,
    location: eventPayload.location || 'Chandigarh University',
    image_url: eventPayload.image_url || null,
    pdf_url: eventPayload.pdf_url || null,
    status: (eventPayload.status as any) || 'upcoming',
    registration_enabled: eventPayload.registration_enabled ?? true,
    registration_start: eventPayload.registration_start || null,
    registration_end: eventPayload.registration_end || null,
    supports_teams: eventPayload.supports_teams ?? false,
    max_team_size: eventPayload.max_team_size ?? 1,
    max_registrations: eventPayload.max_registrations ?? null,
    category: eventPayload.category || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  saveStoredCategory(createdEvent.id, createdEvent.category || null);

  // Save locally first so creation NEVER fails on frontend UI
  saveLocalCustomEvent(createdEvent);

  if (!isSupabaseConfigured()) {
    return createdEvent;
  }

  // 1. Attempt RPC call create_event_admin
  const { data: rpcData, error: rpcError } = await supabase.rpc('create_event_admin', {
    p_id: createdEvent.id,
    p_title: createdEvent.title,
    p_category: createdEvent.category || null,
    p_slug: createdEvent.slug,
    p_description: createdEvent.description,
    p_date: createdEvent.date,
    p_start_time: createdEvent.start_time,
    p_location: createdEvent.location,
    p_pdf_url: createdEvent.pdf_url,
    p_image_url: createdEvent.image_url,
    p_registration_enabled: createdEvent.registration_enabled,
    p_registration_start: createdEvent.registration_start,
    p_registration_end: createdEvent.registration_end,
    p_supports_teams: createdEvent.supports_teams,
    p_max_team_size: createdEvent.max_team_size,
    p_max_registrations: createdEvent.max_registrations,
  });

  if (!rpcError && rpcData) {
    return rpcData as Event;
  }

  // 2. Direct insert fallback
  let { data, error } = await supabase
    .from('events')
    .insert([createdEvent])
    .select('*')
    .maybeSingle();

  if (error && error.message.includes('category')) {
    const { category, ...rest } = createdEvent;
    const retry = await supabase.from('events').insert([rest]).select('*').maybeSingle();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.warn('DB Event insert notice (event saved locally):', error.message);
  }

  return (data as Event) || createdEvent;
};

export const updateEventAdmin = async (
  eventId: string,
  eventPayload: Partial<Event>
): Promise<Event> => {
  if (eventPayload.category !== undefined) {
    saveStoredCategory(eventId, eventPayload.category);
  }

  // Recalculate status based on date if date is provided and status is not explicitly cancelled
  if (eventPayload.date && eventPayload.status !== 'cancelled') {
    const _now = new Date();
    const todayStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;
    const newDateStr = eventPayload.date.split('T')[0];
    if (newDateStr === todayStr) {
      eventPayload.status = 'live';
    } else if (newDateStr > todayStr) {
      eventPayload.status = 'upcoming';
    } else if (newDateStr < todayStr) {
      eventPayload.status = 'completed';
    }
  }

  // Update local storage
  const list = getLocalCustomEvents();
  const index = list.findIndex((e) => e.id === eventId);
  if (index !== -1) {
    list[index] = { ...list[index], ...eventPayload, updated_at: new Date().toISOString() };
    localStorage.setItem(CUSTOM_EVENTS_KEY, JSON.stringify(list));
  }

  if (!isSupabaseConfigured()) {
    return (list[index] || eventPayload) as Event;
  }

  // 1. Attempt RPC update_event_admin
  const { data: rpcData, error: rpcError } = await supabase.rpc('update_event_admin', {
    p_id: eventId,
    p_title: eventPayload.title,
    p_category: eventPayload.category !== undefined ? eventPayload.category : null,
    p_description: eventPayload.description || null,
    p_date: eventPayload.date || null,
    p_start_time: eventPayload.start_time || null,
    p_location: eventPayload.location || null,
    p_pdf_url: eventPayload.pdf_url || null,
    p_image_url: eventPayload.image_url || null,
    p_status: eventPayload.status || null,
    p_registration_enabled: eventPayload.registration_enabled ?? true,
    p_registration_start: eventPayload.registration_start || null,
    p_registration_end: eventPayload.registration_end || null,
    p_supports_teams: eventPayload.supports_teams ?? false,
    p_max_team_size: eventPayload.max_team_size ?? 1,
    p_max_registrations: eventPayload.max_registrations ?? null,
  });

  if (!rpcError && rpcData) {
    return rpcData as Event;
  }

  // 2. Direct update fallback
  const updateFields: any = {
    title: eventPayload.title,
    category: eventPayload.category !== undefined ? eventPayload.category : null,
    description: eventPayload.description || null,
    date: eventPayload.date || null,
    start_time: eventPayload.start_time || null,
    location: eventPayload.location || null,
    pdf_url: eventPayload.pdf_url || null,
    image_url: eventPayload.image_url || null,
    status: eventPayload.status || undefined,
    registration_enabled: eventPayload.registration_enabled ?? true,
    registration_start: eventPayload.registration_start || null,
    registration_end: eventPayload.registration_end || null,
    supports_teams: eventPayload.supports_teams ?? false,
    max_team_size: eventPayload.max_team_size ?? 1,
    max_registrations: eventPayload.max_registrations ?? null,
    updated_at: new Date().toISOString(),
  };

  let { data, error } = await supabase
    .from('events')
    .update(updateFields)
    .eq('id', eventId)
    .select('*')
    .maybeSingle();

  if (error && error.message.includes('category')) {
    delete updateFields.category;
    const retry = await supabase
      .from('events')
      .update(updateFields)
      .eq('id', eventId)
      .select('*')
      .maybeSingle();
    data = retry.data;
  }

  return (data || list[index] || eventPayload) as Event;
};

export const deleteEventPosterAdmin = async (eventId: string): Promise<boolean> => {
  const list = getLocalCustomEvents();
  const index = list.findIndex((e) => e.id === eventId);
  if (index !== -1) {
    list[index].image_url = null;
    localStorage.setItem(CUSTOM_EVENTS_KEY, JSON.stringify(list));
  }

  if (!isSupabaseConfigured()) return true;

  const { error } = await supabase
    .from('events')
    .update({ image_url: null, updated_at: new Date().toISOString() })
    .eq('id', eventId);

  return !error;
};

export const deleteEventPdfAdmin = async (eventId: string): Promise<boolean> => {
  const list = getLocalCustomEvents();
  const index = list.findIndex((e) => e.id === eventId);
  if (index !== -1) {
    list[index].pdf_url = null;
    localStorage.setItem(CUSTOM_EVENTS_KEY, JSON.stringify(list));
  }

  if (!isSupabaseConfigured()) return true;

  const { error } = await supabase
    .from('events')
    .update({ pdf_url: null, updated_at: new Date().toISOString() })
    .eq('id', eventId);

  return !error;
};

export const deleteEventAdmin = async (
  eventId: string,
  existingPdfUrl?: string | null,
  existingImageUrl?: string | null
): Promise<void> => {
  // 1. Remove from local storage
  removeLocalCustomEvent(eventId);

  if (!isSupabaseConfigured()) return;

  // 2. Clean up files from R2 storage if stored as URL or path
  if (existingPdfUrl && !existingPdfUrl.startsWith('data:')) {
    await deleteFromR2(existingPdfUrl).catch(() => {});
  }
  if (existingImageUrl && !existingImageUrl.startsWith('data:')) {
    await deleteFromR2(existingImageUrl).catch(() => {});
  }

  // 3. Attempt RPC delete_event_admin (sets status = 'cancelled', pdf_url = NULL, image_url = NULL)
  const { error: rpcError } = await supabase.rpc('delete_event_admin', {
    p_id: eventId,
  });

  if (rpcError) {
    // 4. Direct update fallback (clears pdf_url and image_url to free up DB space)
    const { error: updateError } = await supabase
      .from('events')
      .update({
        status: 'cancelled',
        pdf_url: null,
        image_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', eventId);

    if (updateError) {
      await supabase.from('events').delete().eq('id', eventId);
    }
  }
};

export const getEventBySlug = async (slug: string): Promise<Event | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error(`Error fetching event ${slug}:`, error.message);
    return null;
  }

  return data;
};

export const getEventById = async (id: string): Promise<Event | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching event ${id}:`, error.message);
    return null;
  }

  return data;
};
