import { supabase, isSupabaseConfigured, STORAGE_BUCKETS } from '../lib/supabase';
import type { Member, MemberApplicationPayload } from '../types/database';

const INACTIVE_MEMBERS_KEY = 'csc_inactive_member_ids';

const getInactiveMemberIds = (): string[] => {
  try {
    const stored = localStorage.getItem(INACTIVE_MEMBERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const markMemberInactiveLocally = (memberId: string): void => {
  try {
    const list = getInactiveMemberIds();
    if (!list.includes(memberId)) {
      list.push(memberId);
      localStorage.setItem(INACTIVE_MEMBERS_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.warn('Could not save inactive member ID locally:', err);
  }
};

export const submitMemberApplication = async (
  payload: MemberApplicationPayload,
  verificationFile?: File | null
): Promise<Member> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured yet. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { name, email, phone, uid, department, year } = payload;
  const memberId = crypto.randomUUID();
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const regId = `CSC-${new Date().getFullYear()}-${randomSuffix}`;

  let filePath: string | null = null;

  // 1. If verification document is provided, upload it to private storage bucket FIRST
  if (verificationFile) {
    try {
      filePath = `membership/${memberId}/${verificationFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.REGISTRATION_FILES)
        .upload(filePath, verificationFile, { upsert: true });

      if (uploadError) {
        console.warn('Storage upload notice:', uploadError.message);
      }
    } catch (uploadErr) {
      console.warn('Storage upload error:', uploadErr);
    }
  }

  // 2. Insert member application record into Supabase `members` table with ID and verification_file_url included!
  const insertPayload = {
    id: memberId,
    registration_id: regId,
    uid: uid.trim(),
    name: name.trim(),
    email: email.trim(),
    phone: phone?.trim() || null,
    department: department?.trim() || null,
    year: year || null,
    status: 'pending' as const,
    is_core_member: false,
    verification_file_url: filePath,
  };

  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .insert(insertPayload)
    .select('*')
    .maybeSingle();

  if (memberError || !memberData) {
    const { error: fallbackError } = await supabase.from('members').insert(insertPayload);
    if (fallbackError) {
      console.error('Error inserting member application:', fallbackError.message);
      throw new Error(`Membership application failed: ${fallbackError.message}`);
    }
  }

  return (
    (memberData as Member) || {
      ...insertPayload,
      role_id: null,
      joined_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  );
};

export const getPendingMemberApplications = async (): Promise<Member[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from('members')
    .select('*, role:roles(*)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending member applications:', error.message);
    return [];
  }

  const inactiveIds = getInactiveMemberIds();
  const membersList = ((data as Member[]) || []).filter((m) => !inactiveIds.includes(m.id));
  const now = Date.now();
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;

  // Auto-cleanup any verification files older than 24 hours
  for (const m of membersList) {
    if (m.verification_file_url && m.created_at) {
      const createdAtMs = new Date(m.created_at).getTime();
      if (now - createdAtMs > twentyFourHoursMs) {
        const filePath = m.verification_file_url;
        m.verification_file_url = null;

        // Clean up from storage & update DB asynchronously
        supabase.storage
          .from(STORAGE_BUCKETS.REGISTRATION_FILES)
          .remove([filePath])
          .then(() => {
            supabase
              .from('members')
              .update({ verification_file_url: null })
              .eq('id', m.id);
          })
          .catch(() => {});
      }
    }
  }

  return membersList;
};

export const approveMemberApplicationService = async (
  memberId: string,
  verificationFilePath?: string | null
): Promise<void> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }

  // 1. Delete physical document from private storage bucket
  if (verificationFilePath) {
    await supabase.storage
      .from(STORAGE_BUCKETS.REGISTRATION_FILES)
      .remove([verificationFilePath])
      .catch((err) => console.warn('Storage cleanup warning:', err));
  }

  // 2. Call DB function to activate member and clear verification_file_url
  const { error: rpcError } = await supabase.rpc('approve_member_application', {
    p_member_id: memberId,
  });

  if (rpcError) {
    // Direct update fallback
    const { error: updateError } = await supabase
      .from('members')
      .update({
        status: 'active',
        verification_file_url: null,
      })
      .eq('id', memberId);

    if (updateError) {
      throw updateError;
    }
  }
};

export const rejectMemberApplicationService = async (
  memberId: string,
  verificationFilePath?: string | null
): Promise<void> => {
  markMemberInactiveLocally(memberId);

  if (!isSupabaseConfigured()) {
    return;
  }

  // 1. Delete physical document from private storage bucket
  if (verificationFilePath) {
    await supabase.storage
      .from(STORAGE_BUCKETS.REGISTRATION_FILES)
      .remove([verificationFilePath])
      .catch(() => {});
  }

  // 2. Call DB function or direct update to set status = 'inactive'
  const { error: rpcError } = await supabase.rpc('reject_member_application', {
    p_member_id: memberId,
  });

  if (rpcError) {
    try {
      await supabase
        .from('members')
        .update({
          status: 'inactive',
          verification_file_url: null,
        })
        .eq('id', memberId);
    } catch (err) {
      console.warn('Reject direct update notice:', err);
    }
  }
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

  const inactiveIds = getInactiveMemberIds();
  return ((data as Member[]) || []).filter((m) => !inactiveIds.includes(m.id));
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

  const inactiveIds = getInactiveMemberIds();
  return ((data as Member[]) || []).filter((m) => !inactiveIds.includes(m.id));
};

export const deleteMemberAdmin = async (memberId: string): Promise<void> => {
  // Always mark inactive locally so it disappears permanently from Admin Panel UI!
  markMemberInactiveLocally(memberId);

  if (!isSupabaseConfigured()) return;

  // 1. Execute SECURITY DEFINER RPC set_member_inactive
  const { error: rpcError } = await supabase.rpc('set_member_inactive', {
    p_member_id: memberId,
  });

  if (rpcError) {
    console.warn('RPC set_member_inactive notice, running direct update fallback:', rpcError.message);
    try {
      await supabase
        .from('members')
        .update({
          status: 'inactive',
          verification_file_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', memberId);
    } catch (err) {
      console.warn('Direct update notice:', err);
    }
  }
};

export const toggleCoreMemberStatusAdmin = async (
  memberId: string,
  isCore: boolean
): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase
    .from('members')
    .update({ is_core_member: isCore })
    .eq('id', memberId);
  if (error) throw error;
};

export const updateMemberRoleAndCoreStatusAdmin = async (
  memberId: string,
  roleId: string | null,
  isCore: boolean
): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase
    .from('members')
    .update({
      role_id: roleId,
      is_core_member: isCore,
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId);

  if (error) throw error;
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
