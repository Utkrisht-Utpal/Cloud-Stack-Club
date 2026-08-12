/**
 * Supabase Service Gateway & Exports
 */
export { supabase, isSupabaseConfigured, STORAGE_BUCKETS, getStoragePath } from '../lib/supabase';
export * from './roles';
export * from './members';
export * from './events';
export * from './registrationForms';
export * from './registrations';
export * from './feedback';

export const supabaseStubNote = "Supabase backend integration active. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable live persistence.";
