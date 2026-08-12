import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured = (): boolean => {
  return (
    !!import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
    !!import.meta.env.VITE_SUPABASE_ANON_KEY &&
    import.meta.env.VITE_SUPABASE_ANON_KEY !== 'placeholder-anon-key'
  );
};

export const supabase = createClient<Database, 'public', any>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Storage bucket constants matching database migrations
 */
export const STORAGE_BUCKETS = {
  EVENT_IMAGES: 'event-images',
  EVENT_PDFS: 'event-pdfs',
  REGISTRATION_FILES: 'registration-files',
} as const;

/**
 * Helper utility to build predictable storage paths
 */
export const getStoragePath = {
  eventImage: (eventId: string, filename: string = 'cover.webp') => 
    `event-images/${eventId}/${filename}`,
  eventPdf: (eventId: string, filename: string = 'details.pdf') => 
    `event-pdfs/${eventId}/${filename}`,
  registrationFile: (eventId: string, registrationId: string, filename: string) => 
    `registration-files/${eventId}/${registrationId}/${filename}`,
};
