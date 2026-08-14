import { supabase, isSupabaseConfigured, STORAGE_BUCKETS } from '../lib/supabase';
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

  const todayStr = new Date().toISOString().split('T')[0];
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

  const todayStr = new Date().toISOString().split('T')[0];

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
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .neq('status', 'cancelled')
      .order('date', { ascending: true });

    if (error) {
      console.warn('Error fetching events from DB:', error.message);
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

    return sortEventsByRelevance(eventsWithCat);
  } catch {
    const localEvents = getLocalCustomEvents();
    return sortEventsByRelevance(localEvents);
  }
};

export const getEventPdfViewerUrl = (pdfPathOrUrl: string | null): string => {
  if (!pdfPathOrUrl) return '';
  if (
    pdfPathOrUrl.startsWith('http://') ||
    pdfPathOrUrl.startsWith('https://') ||
    pdfPathOrUrl.startsWith('data:') ||
    pdfPathOrUrl.startsWith('blob:')
  ) {
    return pdfPathOrUrl;
  }
  const { data } = supabase.storage
    .from(STORAGE_BUCKETS.REGISTRATION_FILES)
    .getPublicUrl(pdfPathOrUrl);
  return data.publicUrl;
};

export const uploadEventPdf = async (file: File, _eventId: string): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve((reader.result as string) || '');
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

export const uploadEventImage = async (file: File, _eventId: string): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve((reader.result as string) || '');
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

export const createEvent = async (eventPayload: Partial<Event>): Promise<Event> => {
  const eventId = eventPayload.id || crypto.randomUUID();
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
    error = retry.error;
  }

  if (error) {
    console.warn('Direct event update error notice:', error.message);
  }

  return (data as Event) || (list[index] as Event) || (eventPayload as Event);
};

export const deleteEventAdmin = async (
  eventId: string,
  existingPdfUrl?: string | null,
  existingImageUrl?: string | null
): Promise<void> => {
  // 1. Remove from local storage
  removeLocalCustomEvent(eventId);

  if (!isSupabaseConfigured()) return;

  // 2. Clean up files from Supabase storage buckets if stored as path
  if (existingPdfUrl && !existingPdfUrl.startsWith('data:') && !existingPdfUrl.startsWith('http')) {
    await supabase.storage.from(STORAGE_BUCKETS.REGISTRATION_FILES).remove([existingPdfUrl]).catch(() => {});
  }
  if (existingImageUrl && !existingImageUrl.startsWith('data:') && !existingImageUrl.startsWith('http')) {
    await supabase.storage.from(STORAGE_BUCKETS.EVENT_IMAGES).remove([existingImageUrl]).catch(() => {});
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
