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

export const getEvents = async (): Promise<Event[]> => {
  const localEvents = getLocalCustomEvents();
  if (!isSupabaseConfigured()) {
    return localEvents;
  }

  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .neq('status', 'cancelled')
      .order('date', { ascending: true });

    if (error) {
      console.warn('Error fetching events from DB, returning local events:', error.message);
      return localEvents;
    }

    const dbEvents = (data as Event[]) || [];
    const dbEventIds = new Set(dbEvents.map((e) => e.id));
    const uniqueLocalEvents = localEvents.filter((e) => !dbEventIds.has(e.id));
    return [...uniqueLocalEvents, ...dbEvents];
  } catch {
    return localEvents;
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

export const uploadEventPdf = async (file: File, eventId: string): Promise<string> => {
  const readFileAsDataUrl = (f: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(f);
    });
  };

  const dataUrl = await readFileAsDataUrl(file);

  if (!isSupabaseConfigured()) {
    return dataUrl;
  }

  try {
    const filePath = `events/${eventId}/${file.name}`;
    const { error } = await supabase.storage
      .from(STORAGE_BUCKETS.REGISTRATION_FILES)
      .upload(filePath, file, { upsert: true });

    if (error) {
      console.warn('Event PDF storage upload notice (using Data URL fallback):', error.message);
      return dataUrl;
    }
    return filePath;
  } catch (err) {
    console.error('Event PDF upload error (using Data URL fallback):', err);
    return dataUrl;
  }
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
    registration_start: null,
    registration_end: null,
    supports_teams: false,
    max_team_size: 1,
    max_registrations: 100,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Save locally first so creation NEVER fails on frontend UI
  saveLocalCustomEvent(createdEvent);

  if (!isSupabaseConfigured()) {
    return createdEvent;
  }

  // 1. Attempt RPC call create_event_admin
  const { data: rpcData, error: rpcError } = await supabase.rpc('create_event_admin', {
    p_id: createdEvent.id,
    p_title: createdEvent.title,
    p_slug: createdEvent.slug,
    p_description: createdEvent.description,
    p_date: createdEvent.date,
    p_start_time: createdEvent.start_time,
    p_location: createdEvent.location,
    p_pdf_url: createdEvent.pdf_url,
    p_registration_enabled: createdEvent.registration_enabled,
  });

  if (!rpcError && rpcData) {
    return rpcData as Event;
  }

  // 2. Direct insert fallback
  const { data, error } = await supabase
    .from('events')
    .insert([createdEvent])
    .select('*')
    .maybeSingle();

  if (error) {
    console.warn('DB Event insert notice (event saved locally):', error.message);
  }

  return (data as Event) || createdEvent;
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
