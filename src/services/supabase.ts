/**
 * Supabase Service Gateway & Exports
 */
export { supabase, isSupabaseConfigured } from '../lib/supabase';
export { uploadToR2, deleteFromR2, bulkDeleteFromR2, getR2PublicUrl, resolveMediaUrl, isR2Configured, R2_FOLDERS } from '../lib/r2Storage';
export * from './roles';
export * from './members';
export * from './events';
export * from './registrationForms';
export * from './registrations';
export * from './feedback';

export const supabaseStubNote = "Supabase backend integration active. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable live persistence.";
