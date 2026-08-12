import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Member } from '../types/database';

export const getCoreMembers = async (): Promise<Member[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from('members')
    .select('*, role:roles(*)')
    .eq('status', 'active')
    .eq('is_core_member', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching core members:', error.message);
    throw error;
  }

  return (data as Member[]) || [];
};

export const getMembers = async (): Promise<Member[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from('members')
    .select('*, role:roles(*)')
    .eq('status', 'active')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching members:', error.message);
    throw error;
  }

  return (data as Member[]) || [];
};

export const getMemberByUid = async (uid: string): Promise<Member | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await supabase
    .from('members')
    .select('*, role:roles(*)')
    .eq('uid', uid)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error(`Error fetching member by UID ${uid}:`, error.message);
    return null;
  }

  return data as Member | null;
};

export const getMemberByRegistrationId = async (registrationId: string): Promise<Member | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await supabase
    .from('members')
    .select('*, role:roles(*)')
    .eq('registration_id', registrationId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error(`Error fetching member by registrationId ${registrationId}:`, error.message);
    return null;
  }

  return data as Member | null;
};
