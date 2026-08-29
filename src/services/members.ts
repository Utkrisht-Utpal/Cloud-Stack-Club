import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { deleteFromR2 } from '../lib/r2Storage';
import { generateUUID } from '../utils/uuid';
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

export const checkMemberDuplicate = async (
  _uid: string,
  _email: string,
  _phone?: string
): Promise<{ isDuplicate: boolean; field?: 'UID' | 'Email' | 'Mobile Number'; message?: string }> => {
  // Server-side RPC submit_member_application atomically validates duplicates
  return { isDuplicate: false };
};

export const submitMemberApplication = async (
  payload: MemberApplicationPayload,
  verificationFile?: File | null,
  turnstileToken?: string
): Promise<Member> => {
  const { name, email, phone, uid, department, year } = payload;
  const cleanUid = uid.trim();
  const cleanEmail = email.trim();
  const cleanPhone = phone?.trim() || '';

  let filePath: string | null = null;

  // 1. Submit application atomically via Cloudflare Worker Zero-Trust Gateway
  const workerUrl = import.meta.env.VITE_MEDIA_WORKER_URL || '';
  let result: any = null;

  if (workerUrl) {
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('email', cleanEmail);
      formData.append('phone', cleanPhone);
      formData.append('uid', cleanUid);
      formData.append('department', department?.trim() || '');
      formData.append('year', year || '');
      if (turnstileToken) {
        formData.append('turnstile_token', turnstileToken);
      }
      if (verificationFile) {
        formData.append('file', verificationFile);
      }

      const response = await fetch(`${workerUrl}/api/submit-member`, {
        method: 'POST',
        headers: {
          ...(turnstileToken ? { 'cf-turnstile-response': turnstileToken } : {}),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({ error: 'Submission failed' }));
        throw new Error((errorJson as any).error || `Submission failed with status ${response.status}`);
      }

      result = await response.json();
    } catch (err: any) {
      if (err.message && !err.message.includes('Failed to fetch')) {
        throw err;
      }
    }
  }

  // 3. Fallback direct RPC if worker not reachable or in development
  if (!result && isSupabaseConfigured()) {
    const { data: rpcData, error: rpcError } = await supabase.rpc('submit_member_application', {
      p_name: name.trim(),
      p_email: cleanEmail,
      p_phone: cleanPhone,
      p_uid: cleanUid,
      p_department: department?.trim() || '',
      p_year: year || '',
      p_verification_file_url: filePath || '',
    });

    if (rpcError) {
      console.error('Error submitting member application via RPC:', rpcError.message);
      throw new Error(rpcError.message || 'Membership application submission failed.');
    }

    result = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
  }

  const newMember: Member = {
    id: result?.id || generateUUID(),
    registration_id: result?.registration_id || `CSC-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    uid: cleanUid,
    name: name.trim(),
    email: cleanEmail,
    phone: cleanPhone || null,
    department: department?.trim() || null,
    year: year || null,
    status: 'pending',
    is_core_member: false,
    role_id: null,
    verification_file_url: filePath,
    joined_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return newMember;
};

export const getPendingMemberApplications = async (): Promise<Member[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('members')
      .select('*, role:roles(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Notice fetching pending member applications:', error.message);
      return [];
    }

    const inactiveIds = getInactiveMemberIds();
    return ((data as Member[]) || []).filter((m) => !inactiveIds.includes(m.id));
  } catch (err) {
    console.warn('Network error fetching pending apps:', err);
    return [];
  }
};

export const approveMemberApplicationService = async (
  memberId: string,
  verificationFilePath?: string | null
): Promise<void> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }

  // 1. Immediately delete physical verification document from R2 storage upon approval
  if (verificationFilePath) {
    await deleteFromR2(verificationFilePath)
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
  _verificationFilePath?: string | null
): Promise<void> => {
  markMemberInactiveLocally(memberId);

  if (!isSupabaseConfigured()) {
    return;
  }

  // On rejection, we do NOT delete immediately so the admin has a 24-hour review/audit window.
  // The file is automatically purged after 24 hours via R2 Lifecycle rules.
  const { error: rpcError } = await supabase.rpc('reject_member_application', {
    p_member_id: memberId,
  });

  if (rpcError) {
    try {
      await supabase
        .from('members')
        .update({
          status: 'inactive',
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
    .select('id, registration_id, name, department, year, role_id, is_core_member, status, created_at, role:roles(*)')
    .eq('status', 'active')
    .eq('is_core_member', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('Notice fetching core members:', error.message);
    return [];
  }

  const inactiveIds = getInactiveMemberIds();
  return (((data as unknown) as Member[]) || []).filter((m) => !inactiveIds.includes(m.id));
};

export const getMembers = async (): Promise<Member[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from('members')
    .select('id, registration_id, name, department, year, role_id, is_core_member, status, created_at, role:roles(*)')
    .eq('status', 'active')
    .order('name', { ascending: true });

  if (error) {
    console.warn('Notice fetching members:', error.message);
    return [];
  }

  const inactiveIds = getInactiveMemberIds();
  return (((data as unknown) as Member[]) || []).filter((m) => !inactiveIds.includes(m.id));
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
