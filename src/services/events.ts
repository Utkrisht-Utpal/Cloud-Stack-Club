import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Event } from '../types/database';

export const getEvents = async (): Promise<Event[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .neq('status', 'cancelled')
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching events:', error.message);
    throw error;
  }

  return data || [];
};

export const createEvent = async (eventPayload: Partial<Event>): Promise<Event> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('events')
    .insert([eventPayload])
    .select('*')
    .single();

  if (error) throw error;
  return data as Event;
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
