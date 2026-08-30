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
  if (!workerUrl) {
    throw new Error('Public API Gateway is not configured. Please check VITE_MEDIA_WORKER_URL.');
  }

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
    const errorJson = await response.json().catch(() => ({ error: 'Membership application failed' }));
    throw new Error((errorJson as any).error || `Membership application failed with status ${response.status}`);
  }

  const result = await response.json();

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

  try {
    const { data: membersData, error } = await supabase.rpc('get_public_members');

    if (error || !membersData) {
      console.warn('Notice fetching core members via RPC:', error?.message);
      return [];
    }

    // Fetch public roles to attach role objects
    const { data: rolesData } = await supabase
      .from('roles')
      .select('*')
      .order('display_order', { ascending: true });

    const rolesMap = new Map<string, any>((rolesData || []).map((r) => [r.id, r]));

    const parsed = typeof membersData === 'string' ? JSON.parse(membersData) : membersData;
    const inactiveIds = getInactiveMemberIds();

    const members: Member[] = (parsed || [])
      .filter((m: any) => m.is_core_member && !inactiveIds.includes(m.id))
      .map((m: any) => ({
        id: m.id,
        registration_id: m.registration_id,
        name: m.name,
        department: m.department || null,
        year: m.year || null,
        role_id: m.role_id || null,
        is_core_member: Boolean(m.is_core_member),
        status: 'active',
        created_at: m.created_at,
        role: m.role_id ? rolesMap.get(m.role_id) || null : null,
      }));

    return members.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
  } catch (err) {
    console.warn('Exception fetching core members:', err);
    return [];
  }
};

export const getMembers = async (): Promise<Member[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data: membersData, error } = await supabase.rpc('get_public_members');

    if (error || !membersData) {
      console.warn('Notice fetching members via RPC:', error?.message);
      return [];
    }

    // Fetch public roles to attach role objects
    const { data: rolesData } = await supabase
      .from('roles')
      .select('*')
      .order('display_order', { ascending: true });

    const rolesMap = new Map<string, any>((rolesData || []).map((r) => [r.id, r]));

    const parsed = typeof membersData === 'string' ? JSON.parse(membersData) : membersData;
    const inactiveIds = getInactiveMemberIds();

    const members: Member[] = (parsed || [])
      .filter((m: any) => !inactiveIds.includes(m.id))
      .map((m: any) => ({
        id: m.id,
        registration_id: m.registration_id,
        name: m.name,
        department: m.department || null,
        year: m.year || null,
        role_id: m.role_id || null,
        is_core_member: Boolean(m.is_core_member),
        status: 'active',
        created_at: m.created_at,
        role: m.role_id ? rolesMap.get(m.role_id) || null : null,
      }));

    return members.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } catch (err) {
    console.warn('Exception fetching members:', err);
    return [];
  }
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
