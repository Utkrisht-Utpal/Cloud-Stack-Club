import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { uploadToR2, bulkDeleteFromR2, isR2Configured, R2_FOLDERS } from '../lib/r2Storage';
import type { EventRegistrationPayload, EventRegistration } from '../types/database';

export const registerForEvent = async (
  payload: EventRegistrationPayload,
  turnstileToken?: string
): Promise<EventRegistration> => {
  const {
    event_id,
    registrant_name,
    registrant_email,
    registrant_phone,
    uid,
    team_name,
    team_members,
    answers,
  } = payload;

  // 0. Ensure targetEventId is resolved to the exact event UUID from public events table
  let targetEventId = event_id;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetEventId);

  if (!isUuid && isSupabaseConfigured()) {
    try {
      const { data: eventBySlug } = await supabase
        .from('events')
        .select('id')
        .eq('slug', targetEventId)
        .maybeSingle();

      if (eventBySlug && (eventBySlug as any).id) {
        targetEventId = (eventBySlug as any).id;
      } else {
        const { data: eventByTitle } = await supabase
          .from('events')
          .select('id')
          .ilike('title', `%${targetEventId}%`)
          .maybeSingle();

        if (eventByTitle && (eventByTitle as any).id) {
          targetEventId = (eventByTitle as any).id;
        }
      }
    } catch (e) {}
  }

  const workerUrl = import.meta.env.VITE_MEDIA_WORKER_URL || '';
  if (!workerUrl) {
    throw new Error('Public API Gateway is not configured. Please check VITE_MEDIA_WORKER_URL.');
  }

  const formattedTeamMembers = (team_members || []).map((m) => ({
    name: m.name.trim(),
    email: m.email.trim(),
    phone: m.phone?.trim() || null,
    uid: m.uid ? m.uid.trim().toUpperCase() : null,
  }));

  const formattedAnswers = (answers || []).map((ans) => ({
    field_id: ans.field_id,
    answer_text: ans.answer_text || null,
    answer_json: ans.answer_json || null,
    file_url: ans.file_url || null,
  }));

  // 1. Submit Registration atomically via Cloudflare Worker Zero-Trust Gateway
  const response = await fetch(`${workerUrl}/api/register-event`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(turnstileToken ? { 'cf-turnstile-response': turnstileToken } : {}),
    },
    body: JSON.stringify({
      event_id: targetEventId,
      registrant_name: registrant_name.trim(),
      registrant_email: registrant_email.trim(),
      registrant_phone: registrant_phone?.trim() || null,
      uid: uid ? uid.trim().toUpperCase() : null,
      team_name: team_name?.trim() || null,
      team_members: formattedTeamMembers,
      answers: formattedAnswers,
      turnstile_token: turnstileToken,
    }),
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({ error: 'Registration failed' }));
    throw new Error(errJson.error || `Registration failed with status ${response.status}`);
  }

  const rpcRes = await response.json();
  const parsed = typeof rpcRes === 'string' ? JSON.parse(rpcRes) : rpcRes;
  const isTeamRegistration = Boolean(team_name && team_name.trim() !== '');

  const createdRegistration: EventRegistration = {
    id: parsed.id,
    registration_number: parsed.registration_number,
    event_id: targetEventId,
    member_id: null,
    registrant_name: registrant_name.trim(),
    registrant_email: registrant_email.trim(),
    registrant_phone: registrant_phone?.trim() || null,
    uid: uid ? uid.trim().toUpperCase() : null,
    is_member: false,
    team_id: parsed.team_id || null,
    status: 'registered',
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (parsed.team_id && isTeamRegistration) {
    createdRegistration.team = {
      id: parsed.team_id,
      event_id: targetEventId,
      team_name: team_name!.trim(),
      registration_number: parsed.team_registration_number,
      created_by_registration_id: parsed.id,
      created_at: new Date().toISOString(),
      members: (team_members || []).map((m, idx) => ({
        id: `tm-${idx}`,
        team_id: parsed.team_id,
        name: m.name.trim(),
        email: m.email.trim(),
        phone: m.phone ? m.phone.trim() : null,
        uid: m.uid ? m.uid.trim().toUpperCase() : null,
        registration_number: parsed.team_registration_number,
        member_id: null,
        created_at: new Date().toISOString(),
      })),
    };
  }

  // Save to local cache
  try {
    const key = `csc_event_regs_${targetEventId}`;
    const existing = localStorage.getItem(key);
    const list: EventRegistration[] = existing ? JSON.parse(existing) : [];
    list.unshift(createdRegistration);
    localStorage.setItem(key, JSON.stringify(list));

    const allKey = 'csc_all_event_regs';
    const allExisting = localStorage.getItem(allKey);
    const allList: EventRegistration[] = allExisting ? JSON.parse(allExisting) : [];
    allList.unshift(createdRegistration);
    localStorage.setItem(allKey, JSON.stringify(allList));
  } catch {}

  return createdRegistration;
};

export const uploadRegistrationFile = async (
  eventId: string,
  registrationId: string,
  file: File
): Promise<string> => {
  if (!isR2Configured()) {
    throw new Error('R2 storage is not configured yet.');
  }

  const rawExt = (file.name.split('.').pop() || 'dat').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanExt = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'zip'].includes(rawExt) ? rawExt : 'dat';
  const cleanFileName = `reg_${Date.now()}.${cleanExt}`;
  const filePath = `${eventId}/${registrationId}/${cleanFileName}`;
  await uploadToR2(R2_FOLDERS.REGISTRATION_FILES, filePath, file);

  return filePath;
};

/**
 * Approve membership registration and permanently delete uploaded verification files from R2 Storage.
 */
export const approveMembershipRegistration = async (
  registrationId: string,
  filePathsToDelete: string[] = []
): Promise<void> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured yet.');
  }

  // 1. Delete physical files from R2 registration-files storage
  if (filePathsToDelete.length > 0) {
    const fullPaths = filePathsToDelete.map((p) => `${R2_FOLDERS.REGISTRATION_FILES}/${p}`);
    await bulkDeleteFromR2(fullPaths).catch((err) => {
      console.warn('Warning: R2 files deletion encountered an error:', err);
    });
  }

  // 2. Call DB function to confirm status and clear file references in DB
  const { error: dbError } = await supabase.rpc('approve_membership_registration', {
    p_registration_id: registrationId,
  });

  if (dbError) {
    console.error('Error executing approve_membership_registration RPC:', dbError.message);
    throw dbError;
  }
};

export const getRegistrationByNumber = async (
  regNumber: string
): Promise<EventRegistration | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await supabase
    .from('event_registrations')
    .select('*, team:event_teams(*), answers:registration_answers(*)')
    .eq('registration_number', regNumber)
    .single();

  if (error) {
    console.error(`Error fetching registration ${regNumber}:`, error.message);
    return null;
  }

  return data as EventRegistration;
};
