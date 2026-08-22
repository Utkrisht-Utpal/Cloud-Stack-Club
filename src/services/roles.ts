import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Role } from '../types/database';

export const getRoles = async (): Promise<Role[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('display_order', { ascending: true })
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

export const createRole = async (roleData: {
  name: string;
  description?: string | null;
  display_order?: number;
}): Promise<Role> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Database is not configured.');
  }

  const { data, error } = await supabase
    .from('roles')
    .insert({
      name: roleData.name.trim(),
      description: roleData.description?.trim() || null,
      display_order: roleData.display_order ?? 99,
    })
    .select('*')
    .single();

  if (error) {
    if (error.message?.includes('roles_name_key') || error.message?.includes('unique')) {
      throw new Error(`A role with name "${roleData.name.trim()}" already exists.`);
    }
    console.error('Error creating role:', error.message);
    throw error;
  }

  return data;
};

export const updateRole = async (
  id: string,
  updates: Partial<{
    name: string;
    description: string | null;
    display_order: number;
  }>
): Promise<Role> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Database is not configured.');
  }

  const payload: any = {};
  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.description !== undefined) payload.description = updates.description?.trim() || null;
  if (updates.display_order !== undefined) payload.display_order = updates.display_order;

  const { data, error } = await supabase
    .from('roles')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    if (error.message?.includes('roles_name_key') || error.message?.includes('unique')) {
      throw new Error(`A role with name "${updates.name?.trim()}" already exists.`);
    }
    console.error('Error updating role:', error.message);
    throw error;
  }

  return data;
};

export const deleteRole = async (id: string): Promise<void> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Database is not configured.');
  }

  const { error } = await supabase
    .from('roles')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting role:', error.message);
    throw error;
  }
};
