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

  const pendingDbUpdates: Promise<any>[] = [];

  for (const evt of eventsList) {
    if (evt.status === 'cancelled') continue;

    let needsUpdate = false;
    const updates: Partial<Event> = {};

    // 1. If event date is TODAY -> update status to 'live' (Ongoing)
    if (evt.date && evt.date.split('T')[0] === todayStr && evt.status !== 'live') {
      updates.status = 'live';
      evt.status = 'live';
      needsUpdate = true;
    }
    // 2. If event date is in PAST -> update status to 'completed' & disable registration
    else if (evt.date && evt.date.split('T')[0] < todayStr && evt.status !== 'completed') {
      updates.status = 'completed';
      updates.registration_enabled = false;
      evt.status = 'completed';
      evt.registration_enabled = false;
      needsUpdate = true;
    }

    // 3. If registration_end deadline has passed -> update registration_enabled to false
    if (evt.registration_end && evt.registration_enabled) {
      const endStr = typeof evt.registration_end === 'string' ? evt.registration_end.split('T')[0] : '';
      const [ey, em, ed] = endStr.split('-').map(Number);
      const regEndMs = (ey && em && ed)
        ? new Date(ey, em - 1, ed, 23, 59, 59, 999).getTime()
        : new Date(evt.registration_end).setHours(23, 59, 59, 999);

      if (regEndMs < nowMs) {
        updates.registration_enabled = false;
        evt.registration_enabled = false;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      updates.updated_at = new Date().toISOString();
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          pendingDbUpdates.push(
            Promise.resolve(supabase.from('events').update(updates).eq('id', evt.id))
          );
        }
      } catch {}
    }
  }

  if (pendingDbUpdates.length > 0) {
    Promise.allSettled(pendingDbUpdates).catch(() => {});
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

export const SAFE_PUBLIC_EVENT_COLUMNS = 'id, title, slug, category, description, date, start_time, end_time, location, image_url, status, registration_enabled, registration_start, registration_end, supports_teams, max_team_size, max_registrations, created_at, updated_at';

export const getEvents = async (): Promise<Event[]> => {
  if (!isSupabaseConfigured()) {
    const localEvents = getLocalCustomEvents();
    autoSyncEventStatuses(localEvents);
    return sortEventsByRelevance(localEvents);
  }

  try {
    // 1. Primary: Execute secure RPC get_public_events() (excludes pdf_url)
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_public_events');

    let eventsData: any[] | null = null;

    if (!rpcError && rpcData) {
      eventsData = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
    } else {
      // 2. Fallback A: Query public_events view
      const { data: viewData, error: viewError } = await supabase
        .from('public_events')
        .select('*')
        .order('date', { ascending: true });

      if (!viewError && viewData) {
        eventsData = viewData;
      } else {
        // 3. Fallback B: Query events table with explicit safe public columns
        const { data: tableData, error: tableError } = await supabase
          .from('events')
          .select(SAFE_PUBLIC_EVENT_COLUMNS)
          .neq('status', 'cancelled')
          .order('date', { ascending: true });

        if (!tableError && tableData) {
          eventsData = tableData;
        } else if (tableError) {
          console.warn('Public events fetch notice:', tableError.message);
        }
      }
    }

    if (!eventsData || eventsData.length === 0) {
      const localEvents = getLocalCustomEvents();
      return sortEventsByRelevance(localEvents);
    }

    const dbEvents = (eventsData as Event[]) || [];
    const catMap = getStoredCategoriesMap();
    const eventsWithCat = dbEvents.map((e) => ({
      ...e,
      pdf_url: null, // Guarantee pdf_url is stripped from public memory
      category: e.category || catMap[e.id] || null,
    }));

    // Background non-blocking status sync (0ms load time optimization)
    autoSyncEventStatuses(eventsWithCat).catch(() => {});

    // Save to local storage for instant cached hydration on next visit (sanitized without pdf_url)
    try {
      localStorage.setItem(CUSTOM_EVENTS_KEY, JSON.stringify(eventsWithCat));
    } catch {}

    return sortEventsByRelevance(eventsWithCat);
  } catch {
    const localEvents = getLocalCustomEvents();
    return sortEventsByRelevance(localEvents);
  }
};

export const getAdminEvents = async (): Promise<Event[]> => {
  if (!isSupabaseConfigured()) {
    const localEvents = getLocalCustomEvents();
    return sortEventsByRelevance(localEvents);
  }

  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .neq('status', 'cancelled')
      .order('date', { ascending: true });

    if (error || !data) {
      if (error) console.warn('Admin events fetch notice:', error.message);
      const localEvents = getLocalCustomEvents();
      return sortEventsByRelevance(localEvents);
    }

    const dbEvents = (data as Event[]) || [];
    const catMap = getStoredCategoriesMap();
    const eventsWithCat = dbEvents.map((e) => ({
      ...e,
      category: e.category || catMap[e.id] || null,
    }));

    return sortEventsByRelevance(eventsWithCat);
  } catch (err) {
    console.warn('Exception in getAdminEvents:', err);
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

  // Direct insert for authenticated admin
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

  // Direct update for authenticated admin
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

export const deleteEventPosterAdmin = async (
  eventId: string,
  currentImageUrl?: string | null
): Promise<boolean> => {
  let imageUrl = currentImageUrl;
  const list = getLocalCustomEvents();
  const index = list.findIndex((e) => e.id === eventId);
  if (index !== -1) {
    if (!imageUrl) imageUrl = list[index].image_url;
    list[index].image_url = null;
    localStorage.setItem(CUSTOM_EVENTS_KEY, JSON.stringify(list));
  }

  if (isSupabaseConfigured()) {
    if (!imageUrl) {
      try {
        const { data } = await supabase.from('events').select('image_url').eq('id', eventId).maybeSingle();
        if (data?.image_url) imageUrl = data.image_url;
      } catch (err) {
        console.warn('Could not fetch poster URL before deletion:', err);
      }
    }

    const { error } = await supabase
      .from('events')
      .update({ image_url: null, updated_at: new Date().toISOString() })
      .eq('id', eventId);

    if (error) {
      console.warn('Supabase poster update error:', error);
      return false;
    }
  }

  // Delete from R2 Storage via Worker proxy
  if (isR2Configured() && imageUrl) {
    try {
      await deleteFromR2(imageUrl);
    } catch (err) {
      console.warn('R2 poster deletion notice:', err);
    }
  }

  return true;
};

export const deleteEventPdfAdmin = async (
  eventId: string,
  currentPdfUrl?: string | null
): Promise<boolean> => {
  let pdfUrl = currentPdfUrl;
  const list = getLocalCustomEvents();
  const index = list.findIndex((e) => e.id === eventId);
  if (index !== -1) {
    if (!pdfUrl) pdfUrl = list[index].pdf_url;
    list[index].pdf_url = null;
    localStorage.setItem(CUSTOM_EVENTS_KEY, JSON.stringify(list));
  }

  if (isSupabaseConfigured()) {
    if (!pdfUrl) {
      try {
        const { data } = await supabase.from('events').select('pdf_url').eq('id', eventId).maybeSingle();
        if (data?.pdf_url) pdfUrl = data.pdf_url;
      } catch (err) {
        console.warn('Could not fetch PDF URL before deletion:', err);
      }
    }

    const { error } = await supabase
      .from('events')
      .update({ pdf_url: null, updated_at: new Date().toISOString() })
      .eq('id', eventId);

    if (error) {
      console.warn('Supabase PDF update error:', error);
      return false;
    }
  }

  // Delete from R2 Storage via Worker proxy
  if (isR2Configured() && pdfUrl) {
    try {
      await deleteFromR2(pdfUrl);
    } catch (err) {
      console.warn('R2 PDF deletion notice:', err);
    }
  }

  return true;
};

export const deleteEventAdmin = async (
  eventId: string,
  existingPdfUrl?: string | null,
  existingImageUrl?: string | null
): Promise<void> => {
  // 1. Remove from local storage
  removeLocalCustomEvent(eventId);

  // 2. Fetch live event details from Supabase (to guarantee we have true image_url & pdf_url)
  let pdfUrl = existingPdfUrl;
  let imageUrl = existingImageUrl;

  if (isSupabaseConfigured()) {
    try {
      const { data: currentEvent } = await supabase
        .from('events')
        .select('image_url, pdf_url')
        .eq('id', eventId)
        .maybeSingle();

      if (currentEvent) {
        if (!pdfUrl && currentEvent.pdf_url) pdfUrl = currentEvent.pdf_url;
        if (!imageUrl && currentEvent.image_url) imageUrl = currentEvent.image_url;
      }
    } catch (e) {
      console.warn('Could not fetch event files before deletion:', e);
    }
  }

  // 3. Delete all gallery photos for this event from Cloudflare R2 & database
  //    (dynamic import to avoid circular dependency: gallery.ts imports events.ts)
  try {
    const { deleteGalleryPhotosByEventId } = await import('./gallery');
    await deleteGalleryPhotosByEventId(eventId);
  } catch (e) {
    console.warn('Gallery photos deletion notice:', e);
  }

  // 4. Delete event poster image & brochure PDF from Cloudflare R2
  const filesToDelete: string[] = [];
  if (pdfUrl && !pdfUrl.startsWith('data:')) filesToDelete.push(pdfUrl);
  if (imageUrl && !imageUrl.startsWith('data:')) filesToDelete.push(imageUrl);

  if (filesToDelete.length > 0) {
    await Promise.allSettled(filesToDelete.map((f) => deleteFromR2(f)));
  }

  if (!isSupabaseConfigured()) return;

  // 5. Attempt RPC delete_event_admin (sets status = 'cancelled', pdf_url = NULL, image_url = NULL)
  const { error: rpcError } = await supabase.rpc('delete_event_admin', {
    p_id: eventId,
  });

  if (rpcError) {
    // 6. Direct update fallback (clears pdf_url and image_url to free up DB space)
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

  // 1. Try public_events view or fallback to explicit safe public columns
  let { data, error } = await supabase
    .from('public_events')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) {
    const fallback = await supabase
      .from('events')
      .select(SAFE_PUBLIC_EVENT_COLUMNS)
      .eq('slug', slug)
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error(`Error fetching event ${slug}:`, error.message);
    return null;
  }

  return data as Event | null;
};

export const getEventById = async (id: string): Promise<Event | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  // 1. Try public_events view or fallback to explicit safe public columns
  let { data, error } = await supabase
    .from('public_events')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    const fallback = await supabase
      .from('events')
      .select(SAFE_PUBLIC_EVENT_COLUMNS)
      .eq('id', id)
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error(`Error fetching event ${id}:`, error.message);
    return null;
  }

  return data as Event | null;
};

export const getAdminEventById = async (id: string): Promise<Event | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching admin event ${id}:`, error.message);
    return null;
  }

  return data as Event | null;
};
