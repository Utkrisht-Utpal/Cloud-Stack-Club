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
        event_id,
        team_name: team_name.trim(),
      })
      .select('id')
      .single();

    if (teamError) {
      console.error('Error creating event team:', teamError.message);
      throw new Error(`Team creation failed: ${teamError.message}`);
    }

    team_id = (teamData as any).id;

    // 3. Add team members (enforcing maximum of 5 members)
    if (team_members && team_members.length > 0) {
      const validMembers = team_members.slice(0, 5).map((m) => ({
        team_id,
        name: m.name,
        email: m.email,
        uid: m.uid || null,
      }));

      const { error: membersError } = await supabase
        .from('event_team_members')
        .insert(validMembers);

      if (membersError) {
        console.error('Error adding team members:', membersError.message);
        throw new Error(`Adding team members failed: ${membersError.message}`);
      }
    }
  }

  // 4. Create primary event registration record
  const { data: regData, error: regError } = await supabase
    .from('event_registrations')
    .insert({
      event_id,
      member_id,
      registrant_name,
      registrant_email,
      registrant_phone: registrant_phone || null,
      is_member,
      team_id,
      status: 'registered',
    })
    .select('*')
    .single();

  if (regError || !regData) {
    console.error('Error creating event registration:', regError?.message);
    throw new Error(`Registration failed: ${regError?.message || 'Unknown error'}`);
  }

  const createdRegistration = regData as EventRegistration;

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

    const { error: answersError } = await supabase
      .from('registration_answers')
      .insert(answerRecords);

    if (answersError) {
      console.error('Error saving registration answers:', answersError.message);
    }
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
