import { supabase, isSupabaseConfigured, STORAGE_BUCKETS } from '../lib/supabase';
import type { Member, MemberApplicationPayload } from '../types/database';

export const submitMemberApplication = async (
  payload: MemberApplicationPayload,
  verificationFile?: File | null
): Promise<Member> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured yet. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { name, email, phone, uid, department, year } = payload;

  // Generate unique registration_id (CSC-2026-XXXXXX)
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const regId = `CSC-${new Date().getFullYear()}-${randomSuffix}`;

  // 1. Insert row DIRECTLY into `members` table ONLY (status: 'pending')
  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .insert({
      registration_id: regId,
      uid: uid.trim(),
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim() || null,
      department: department?.trim() || null,
      year: year || null,
      status: 'pending',
      is_core_member: false,
    })
    .select('*')
    .maybeSingle();

  let createdMember: Member;

  if (memberError || !memberData) {
    console.warn('Select query after member insert returned notice. Executing insert fallback:', memberError?.message);

    // Fallback: Perform insert without select chain to bypass RLS select restrictions
    const { error: insertOnlyError } = await supabase
      .from('members')
      .insert({
        registration_id: regId,
        uid: uid.trim(),
        name: name.trim(),
        email: email.trim(),
        phone: phone?.trim() || null,
        department: department?.trim() || null,
        year: year || null,
        status: 'pending',
        is_core_member: false,
      });

    if (insertOnlyError) {
      console.error('Error inserting member application:', insertOnlyError.message);
      throw new Error(`Membership application failed: ${insertOnlyError.message}`);
    }

    createdMember = {
      id: 'mem-' + Date.now(),
      registration_id: regId,
      uid: uid.trim(),
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim() || null,
      department: department?.trim() || null,
      year: year || null,
      role_id: null,
      is_core_member: false,
      joined_at: new Date().toISOString(),
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  } else {
    createdMember = memberData as Member;
  }

  // 2. Upload verification file if attached directly to private storage
  if (verificationFile && createdMember.id) {
    try {
      const filePath = `membership/${createdMember.id}/${verificationFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.REGISTRATION_FILES)
        .upload(filePath, verificationFile, { upsert: true });

      if (!uploadError) {
        await supabase
          .from('members')
          .update({ verification_file_url: filePath })
          .eq('id', createdMember.id);
      }
    } catch (fileErr) {
      console.warn('Optional verification file upload warning:', fileErr);
    }
  }

  return createdMember;
};

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
