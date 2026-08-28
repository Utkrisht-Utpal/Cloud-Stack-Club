import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { uploadToR2, deleteFromR2, isR2Configured, R2_FOLDERS } from '../lib/r2Storage';
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
  uid: string,
  email: string,
  phone?: string
): Promise<{ isDuplicate: boolean; field?: 'UID' | 'Email' | 'Mobile Number'; message?: string }> => {
  if (!isSupabaseConfigured()) return { isDuplicate: false };

  const cleanUid = uid.trim();
  const cleanEmail = email.trim();
  const cleanPhone = phone?.trim() || '';

  // 1. Check UID duplicate in members table (only active or pending members are blocked)
  if (cleanUid) {
    const { data: existingUid } = await supabase
      .from('members')
      .select('id, uid, status')
      .ilike('uid', cleanUid)
      .maybeSingle();

    if (existingUid && existingUid.status !== 'inactive') {
      return {
        isDuplicate: true,
        field: 'UID',
        message: `A member with UID "${cleanUid}" already exists. If you need assistance or wish to update your details, please reach out via the Contact Form (at the bottom of the website).`,
      };
    }
  }

  // 2. Check Email duplicate in members table (only active or pending members are blocked)
  if (cleanEmail) {
    const { data: existingEmail } = await supabase
      .from('members')
      .select('id, email, status')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (existingEmail && existingEmail.status !== 'inactive') {
      return {
        isDuplicate: true,
        field: 'Email',
        message: `A member with Email "${cleanEmail}" already exists. If you need assistance or wish to update your details, please reach out via the Contact Form (at the bottom of the website).`,
      };
    }
  }

  // 3. Check Mobile Number duplicate in members table (only active or pending members are blocked)
  if (cleanPhone) {
    const { data: existingPhone } = await supabase
      .from('members')
      .select('id, phone, status')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (existingPhone && existingPhone.status !== 'inactive') {
      return {
        isDuplicate: true,
        field: 'Mobile Number',
        message: `A member with Mobile Number "${cleanPhone}" already exists. If you need assistance or wish to update your details, please reach out via the Contact Form (at the bottom of the website).`,
      };
    }
  }

  return { isDuplicate: false };
};

export const submitMemberApplication = async (
  payload: MemberApplicationPayload,
  verificationFile?: File | null
): Promise<Member> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured yet. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { name, email, phone, uid, department, year } = payload;
  const cleanUid = uid.trim();
  const cleanEmail = email.trim();
  const cleanPhone = phone?.trim() || null;

  // Check for existing duplicate UID, Email, or Mobile Number (active or pending) BEFORE processing!
  const dupCheck = await checkMemberDuplicate(cleanUid, cleanEmail, cleanPhone || undefined);
  if (dupCheck.isDuplicate) {
    throw new Error(dupCheck.message || `A registration with this ${dupCheck.field} already exists.`);
  }

  // Check if an inactive member record exists matching UID or Email
  let existingInactiveMember: any = null;
  if (isSupabaseConfigured()) {
    if (cleanUid) {
      const { data: memByUid } = await supabase
        .from('members')
        .select('*')
        .ilike('uid', cleanUid)
        .maybeSingle();
      if (memByUid && memByUid.status === 'inactive') {
        existingInactiveMember = memByUid;
      }
    }
    if (!existingInactiveMember && cleanEmail) {
      const { data: memByEmail } = await supabase
        .from('members')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();
      if (memByEmail && memByEmail.status === 'inactive') {
        existingInactiveMember = memByEmail;
      }
    }
  }

  const memberId = existingInactiveMember ? existingInactiveMember.id : generateUUID();
  const regId = existingInactiveMember?.registration_id || `CSC-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  let filePath: string | null = null;

  // 1. If verification document is provided, upload it to R2 storage FIRST
  if (verificationFile) {
    try {
      filePath = `membership/${memberId}/${verificationFile.name}`;
      if (isR2Configured()) {
        await uploadToR2(R2_FOLDERS.REGISTRATION_FILES, filePath, verificationFile);
      }
    } catch (uploadErr) {
      console.warn('Storage upload error:', uploadErr);
    }
  }

  // 2. If existing inactive member found -> UPDATE status back to 'pending' so it appears in pending applications
  if (existingInactiveMember) {
    const updatePayload: any = {
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      uid: cleanUid,
      department: department?.trim() || null,
      year: year || null,
      status: 'pending' as const,
      is_core_member: false,
      verification_file_url: filePath,
      created_at: new Date().toISOString(), // Reset created_at so it shows at the top of pending applications
      updated_at: new Date().toISOString(),
    };

    const { data: updatedData, error: updateError } = await supabase
      .from('members')
      .update(updatePayload)
      .eq('id', existingInactiveMember.id)
      .select('*')
      .maybeSingle();

    if (updateError) {
      console.error('Error reactivating inactive member application:', updateError.message);
      throw new Error(`Membership re-application failed: ${updateError.message}`);
    }

    // Remove from local inactive cache if present
    try {
      const stored = localStorage.getItem(INACTIVE_MEMBERS_KEY);
      if (stored) {
        const list = JSON.parse(stored).filter((id: string) => id !== existingInactiveMember.id);
        localStorage.setItem(INACTIVE_MEMBERS_KEY, JSON.stringify(list));
      }
    } catch {}

    return (updatedData as Member) || {
      ...existingInactiveMember,
      ...updatePayload,
    };
  }

  // 3. Otherwise, INSERT brand new member record
  const insertPayload = {
    id: memberId,
    registration_id: regId,
    uid: cleanUid,
    name: name.trim(),
    email: cleanEmail,
    phone: cleanPhone,
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
    if (memberError?.message?.includes('members_uid_key') || memberError?.message?.includes('uid')) {
      throw new Error(`A member with UID "${cleanUid}" already exists. If you need assistance or wish to update your details, please reach out via the Contact Form (at the bottom of the website).`);
    }
    if (memberError?.message?.includes('members_email_key') || memberError?.message?.includes('email')) {
      throw new Error(`A member with Email "${cleanEmail}" already exists. If you need assistance or wish to update your details, please reach out via the Contact Form (at the bottom of the website).`);
    }
    if (memberError?.message?.includes('phone')) {
      throw new Error(`A member with Mobile Number "${cleanPhone}" already exists. If you need assistance or wish to update your details, please reach out via the Contact Form (at the bottom of the website).`);
    }

    const { error: fallbackError } = await supabase.from('members').insert(insertPayload);
    if (fallbackError) {
      if (fallbackError.message?.includes('uid')) {
        throw new Error(`A member with UID "${cleanUid}" already exists. If you need assistance or wish to update your details, please reach out via the Contact Form (at the bottom of the website).`);
      }
      if (fallbackError.message?.includes('email')) {
        throw new Error(`A member with Email "${cleanEmail}" already exists. If you need assistance or wish to update your details, please reach out via the Contact Form (at the bottom of the website).`);
      }
      if (fallbackError.message?.includes('phone')) {
        throw new Error(`A member with Mobile Number "${cleanPhone}" already exists. If you need assistance or wish to update your details, please reach out via the Contact Form (at the bottom of the website).`);
      }
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

  // 1. Delete physical document from R2 storage
  if (verificationFilePath) {
    await deleteFromR2(`${R2_FOLDERS.REGISTRATION_FILES}/${verificationFilePath}`)
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

  // 1. Delete physical document from R2 storage
  if (verificationFilePath) {
    await deleteFromR2(`${R2_FOLDERS.REGISTRATION_FILES}/${verificationFilePath}`)
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
    console.warn('Notice fetching core members:', error.message);
    return [];
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
    console.warn('Notice fetching members:', error.message);
    return [];
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
