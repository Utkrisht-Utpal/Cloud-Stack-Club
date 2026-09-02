import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { uploadToR2, deleteFromR2, R2_FOLDERS, resolveMediaUrl } from '../lib/r2Storage';
import { generateUUID } from '../utils/uuid';
import { formatPersonName } from '../utils/formatters';
import type { Member, MemberApplicationPayload, CoreTeamMember } from '../types/database';

/**
 * Safe public shape for a core member — used for
 * the "Meet The Team" section.
 */
export interface CoreMember {
  id?: string;
  member_id?: string;
  name: string;
  department: string | null;
  year: string | null;
  role: { name: string | null };
  description?: string | null;
  photo_url?: string | null;
}

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
  const formattedName = formatPersonName(name);
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
  formData.append('name', formattedName);
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
    name: formattedName,
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
  _verificationFilePath?: string | null,
  reason?: string
): Promise<void> => {
  markMemberInactiveLocally(memberId);

  if (!isSupabaseConfigured()) {
    return;
  }

  // On rejection, we do NOT delete immediately so the admin has a 24-hour review/audit window.
  // The file is automatically purged after 24 hours via R2 Lifecycle rules.
  const { error: rpcError } = await supabase.rpc('reject_member_application', {
    p_member_id: memberId,
    p_rejection_reason: reason || null,
  });

  if (rpcError) {
    try {
      await supabase
        .from('members')
        .update({
          status: 'inactive',
          rejection_reason: reason || null,
        })
        .eq('id', memberId);
    } catch (err) {
      console.warn('Reject direct update notice:', err);
    }
  }
};

export const getCoreMembers = async (): Promise<CoreMember[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data: membersData, error } = await supabase.rpc('get_public_members');

    if (!error && membersData) {
      const parsed = typeof membersData === 'string' ? JSON.parse(membersData) : membersData;
      return (parsed || []).map((m: any) => ({
        id: m.id,
        member_id: m.member_id,
        name: m.name,
        department: m.department || null,
        year: m.year || null,
        role: { name: m.role || null },
        description: m.description || null,
        photo_url: m.photo_url ? resolveMediaUrl(m.photo_url) : null,
      }));
    }

    // Direct fallback from core_team_members table
    const { data: directData } = await supabase
      .from('core_team_members')
      .select('id, member_id, name, role, department, year, description, photo_url')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (directData && directData.length > 0) {
      return directData.map((m: any) => ({
        id: m.id,
        member_id: m.member_id,
        name: m.name,
        department: m.department || null,
        year: m.year || null,
        role: { name: m.role || null },
        description: m.description || null,
        photo_url: m.photo_url ? resolveMediaUrl(m.photo_url) : null,
      }));
    }

    return [];
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
    const { data: membersData, error } = await supabase
      .from('members')
      .select(`
        *,
        role:roles(*)
      `)
      .eq('status', 'active')
      .order('name', { ascending: true });

    if (error || !membersData) {
      console.warn('Notice fetching members via direct query:', error?.message);
      return [];
    }
    
    return membersData as Member[];
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

/**
 * Fetch all core team members from the dedicated core_team_members table for the Admin Panel.
 */
export const getCoreTeamMembersAdmin = async (): Promise<CoreTeamMember[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('core_team_members')
      .select('*')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.warn('Notice fetching core team members admin:', error.message);
      return [];
    }

    return (data || []).map((m) => ({
      ...m,
      photo_url: m.photo_url ? resolveMediaUrl(m.photo_url) : null,
    }));
  } catch (err) {
    console.error('Exception fetching core team members admin:', err);
    return [];
  }
};

/**
 * Update a core team member's bio description.
 */
export const updateCoreTeamMemberDescription = async (
  coreTeamMemberId: string,
  description: string
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  const { error } = await supabase
    .from('core_team_members')
    .update({
      description: description.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', coreTeamMemberId);

  if (error) {
    console.error('Error updating core team member description:', error);
    throw new Error(error.message || 'Failed to update description');
  }

  return true;
};

/**
 * Upload a cropped profile photo for a core team member to R2 and update DB.
 */
export const uploadCoreTeamPhoto = async (
  coreTeamMemberId: string,
  file: File
): Promise<string> => {
  const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const cleanExt = ['jpg', 'jpeg', 'png', 'webp'].includes(rawExt) ? rawExt : 'jpg';
  const fileName = `team_${coreTeamMemberId}_${Date.now()}.${cleanExt}`;

  // 1. Upload to Cloudflare R2 under team-photos/ namespace
  const photoUrl = await uploadToR2(R2_FOLDERS.TEAM_PHOTOS, fileName, file);

  // 2. Update core_team_members record in Supabase
  const { error } = await supabase
    .from('core_team_members')
    .update({
      photo_url: photoUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', coreTeamMemberId);

  if (error) {
    console.error('Error saving core team photo URL:', error);
    throw new Error(error.message || 'Failed to save photo URL to database');
  }

  return resolveMediaUrl(photoUrl);
};

/**
 * Delete a core team member's photo from R2 and clear the URL in DB.
 */
export const deleteCoreTeamPhoto = async (
  coreTeamMemberId: string,
  existingPhotoUrl: string | null
): Promise<boolean> => {
  // 1. Delete physical file from R2
  if (existingPhotoUrl) {
    await deleteFromR2(existingPhotoUrl).catch((err) => {
      console.warn('Notice deleting photo from R2:', err);
    });
  }

  // 2. Clear photo_url in database
  if (isSupabaseConfigured()) {
    const { error } = await supabase
      .from('core_team_members')
      .update({
        photo_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', coreTeamMemberId);

    if (error) {
      console.error('Error clearing photo URL in database:', error);
      throw new Error(error.message || 'Failed to clear photo URL');
    }
  }

  return true;
};

export interface TeamPageBannerData {
  banner_url: string | null;
  title?: string | null;
  subtitle?: string | null;
}

const BANNER_STORAGE_KEY = 'csc_team_page_banner_cache';

/**
 * Fetch the public Meet Our Team section banner image and settings.
 */
export const getTeamPageBanner = async (): Promise<TeamPageBannerData> => {
  const cachedUrl = typeof window !== 'undefined' ? localStorage.getItem(BANNER_STORAGE_KEY) : null;

  if (!isSupabaseConfigured()) {
    return { banner_url: cachedUrl ? resolveMediaUrl(cachedUrl) : null };
  }

  try {
    const { data, error } = await supabase
      .from('team_page_banner')
      .select('banner_url, title, subtitle')
      .eq('id', 'main_banner')
      .maybeSingle();

    if (error) {
      console.warn('Notice loading team page banner from DB, using cache fallback:', error.message);
      return { banner_url: cachedUrl ? resolveMediaUrl(cachedUrl) : null };
    }

    if (data?.banner_url) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(BANNER_STORAGE_KEY, data.banner_url);
      }
      return {
        banner_url: resolveMediaUrl(data.banner_url),
        title: data?.title || 'Meet Our Team',
        subtitle: data?.subtitle || null,
      };
    }

    // If DB explicitly returned null banner_url and table exists, clear cache
    if (data && data.banner_url === null) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(BANNER_STORAGE_KEY);
      }
      return { banner_url: null };
    }

    return {
      banner_url: cachedUrl ? resolveMediaUrl(cachedUrl) : null,
    };
  } catch (err) {
    console.warn('Error fetching team banner:', err);
    return { banner_url: cachedUrl ? resolveMediaUrl(cachedUrl) : null };
  }
};

/**
 * Upload team section wide landscape banner to R2 and save in team_page_banner table.
 */
export const uploadTeamPageBanner = async (file: File): Promise<string> => {
  const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const cleanExt = ['jpg', 'jpeg', 'png', 'webp'].includes(rawExt) ? rawExt : 'jpg';
  const fileName = `banner_team_${Date.now()}.${cleanExt}`;

  // 1. Upload to R2 under team-photos/
  const bannerUrl = await uploadToR2(R2_FOLDERS.TEAM_PHOTOS, fileName, file);

  // 2. Cache in localStorage immediately
  if (typeof window !== 'undefined') {
    localStorage.setItem(BANNER_STORAGE_KEY, bannerUrl);
  }

  // 3. Upsert in team_page_banner table
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('team_page_banner')
        .upsert({
          id: 'main_banner',
          banner_url: bannerUrl,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.warn('Notice saving team banner URL to DB:', error.message);
      }
    } catch (dbErr) {
      console.warn('DB upsert error for team banner:', dbErr);
    }
  }

  return resolveMediaUrl(bannerUrl);
};

/**
 * Delete team section banner from R2 and clear URL in DB.
 */
export const deleteTeamPageBanner = async (existingBannerUrl: string | null): Promise<boolean> => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(BANNER_STORAGE_KEY);
  }

  if (existingBannerUrl) {
    await deleteFromR2(existingBannerUrl).catch((err) => {
      console.warn('Notice deleting banner from R2:', err);
    });
  }

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('team_page_banner')
        .upsert({
          id: 'main_banner',
          banner_url: null,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.warn('Notice clearing team banner URL in DB:', error.message);
      }
    } catch (dbErr) {
      console.warn('DB clear error for team banner:', dbErr);
    }
  }

  return true;
};

