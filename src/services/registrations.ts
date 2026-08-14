import { supabase, isSupabaseConfigured, STORAGE_BUCKETS, getStoragePath } from '../lib/supabase';
import type { EventRegistrationPayload, EventRegistration } from '../types/database';

export const registerForEvent = async (
  payload: EventRegistrationPayload
): Promise<EventRegistration> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured yet. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

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

  // 0. Ensure targetEventId is resolved to the exact event UUID from database
  let targetEventId = event_id;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetEventId);

  if (!isUuid && isSupabaseConfigured()) {
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
  }

  // 1. Look up if registrant is an existing member by UID or Email
  let member_id: string | null = payload.member_id || null;
  let is_member = payload.is_member || false;

  if (!member_id && (uid || registrant_email)) {
    let query = supabase.from('members').select('id').eq('status', 'active');
    if (uid) {
      query = query.eq('uid', uid);
    } else {
      query = query.eq('email', registrant_email);
    }

    const { data: memberData } = await query.maybeSingle();
    if (memberData) {
      member_id = (memberData as any).id;
      is_member = true;
    }
  }

  let team_id: string | null = null;

  // 2. If team registration, create event team
  if (team_name && team_name.trim() !== '') {
    const { data: teamData, error: teamError } = await supabase
      .from('event_teams')
      .insert({
        event_id: targetEventId,
        team_name: team_name.trim(),
      })
      .select('id')
      .maybeSingle();

    if (!teamError && teamData) {
      team_id = (teamData as any).id;

      if (team_members && team_members.length > 0) {
        const validMembers = team_members.slice(0, 5).map((m) => ({
          team_id,
          name: m.name,
          email: m.email,
          uid: m.uid || null,
        }));

        await supabase.from('event_team_members').insert(validMembers);
      }
    }
  }

  // 4. Create primary event registration record
  let createdRegistration: EventRegistration;

  const { data: regData, error: regError } = await supabase
    .from('event_registrations')
    .insert({
      event_id: targetEventId,
      member_id,
      registrant_name,
      registrant_email,
      registrant_phone: registrant_phone || null,
      is_member,
      team_id,
      status: 'registered',
    })
    .select('*')
    .maybeSingle();

  if (regError || !regData) {
    console.warn('Select query after insert encountered RLS constraint. Performing insert fallback:', regError?.message);

    // Fallback: Perform insert without select chain to bypass RLS select restrictions
    const { error: insertOnlyError } = await supabase
      .from('event_registrations')
      .insert({
        event_id: targetEventId,
        member_id,
        registrant_name,
        registrant_email,
        registrant_phone: registrant_phone || null,
        is_member,
        team_id,
        status: 'registered',
      });

    if (insertOnlyError) {
      console.error('Error creating event registration:', insertOnlyError.message);
      throw new Error(`Registration failed: ${insertOnlyError.message}`);
    }

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();

    createdRegistration = {
      id: 'reg-' + Date.now(),
      registration_number: `REG-${todayStr}-${randomSuffix}`,
      event_id: targetEventId,
      member_id,
      registrant_name,
      registrant_email,
      registrant_phone: registrant_phone || null,
      is_member,
      team_id,
      status: 'registered',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  } else {
    createdRegistration = regData as EventRegistration;
  }

  // 5. Update team's created_by_registration_id link if team was created
  if (team_id && createdRegistration.id) {
    await supabase
      .from('event_teams')
      .update({ created_by_registration_id: createdRegistration.id })
      .eq('id', team_id);
  }

  // 6. Save form field answers
  if (answers && answers.length > 0) {
    const answerRecords = answers.map((ans) => ({
      registration_id: createdRegistration.id,
      field_id: ans.field_id,
      answer_text: ans.answer_text || null,
      answer_json: ans.answer_json || null,
      file_url: ans.file_url || null,
    }));

    await supabase.from('registration_answers').insert(answerRecords);
  }

  // Save to local storage caches for instant offline resilience and fallback
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
  } catch (e) {
    console.warn('Could not cache registration locally:', e);
  }

  return createdRegistration;
};

export const uploadRegistrationFile = async (
  eventId: string,
  registrationId: string,
  file: File
): Promise<string> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured yet.');
  }

  const filePath = getStoragePath.registrationFile(eventId, registrationId, file.name);

  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.REGISTRATION_FILES)
    .upload(filePath, file, {
      upsert: true,
    });

  if (error) {
    console.error('Error uploading registration file:', error.message);
    throw error;
  }

  return filePath;
};

/**
 * Approve membership registration and permanently delete uploaded verification files from Storage.
 */
export const approveMembershipRegistration = async (
  registrationId: string,
  filePathsToDelete: string[] = []
): Promise<void> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured yet.');
  }

  // 1. Delete physical files from private registration-files storage bucket
  if (filePathsToDelete.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKETS.REGISTRATION_FILES)
      .remove(filePathsToDelete);

    if (storageError) {
      console.warn('Warning: Storage files deletion encountered an error:', storageError.message);
    }
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
