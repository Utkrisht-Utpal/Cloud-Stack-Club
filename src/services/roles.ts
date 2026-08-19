import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Role } from '../types/database';

export const getRoles = async (): Promise<Role[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching roles:', error.message);
    throw error;
  }

  return data || [];
};

export const getRoleById = async (id: string): Promise<Role | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching role ${id}:`, error.message);
    return null;
  }

  return data;
};
