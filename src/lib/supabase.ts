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
    detectSessionInUrl: false,
    // Disable Web Lock contention which causes 30s delays/hangs on localhost & browser reloads
    lock: async (_name, _acquireTimeout, fn) => await fn(),
  },
});
