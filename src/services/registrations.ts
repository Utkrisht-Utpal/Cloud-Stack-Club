import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { uploadToR2, bulkDeleteFromR2, isR2Configured, R2_FOLDERS } from '../lib/r2Storage';
import { generateUUID } from '../utils/uuid';
import type { EventRegistrationPayload, EventRegistration } from '../types/database';

export const registerForEvent = async (
  payload: EventRegistrationPayload,
  turnstileToken?: string
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

  let targetEventObj: any = null;

  if (isSupabaseConfigured()) {
    if (isUuid) {
      const { data: evtById } = await supabase
        .from('events')
        .select('id, title, registration_enabled, registration_start, registration_end, max_registrations')
        .eq('id', targetEventId)
        .maybeSingle();
      targetEventObj = evtById;
    } else {
      const { data: eventBySlug } = await supabase
        .from('events')
        .select('id, title, registration_enabled, registration_start, registration_end, max_registrations')
        .eq('slug', targetEventId)
        .maybeSingle();

      if (eventBySlug && (eventBySlug as any).id) {
        targetEventId = (eventBySlug as any).id;
        targetEventObj = eventBySlug;
      } else {
        const { data: eventByTitle } = await supabase
          .from('events')
          .select('id, title, registration_enabled, registration_start, registration_end, max_registrations')
          .ilike('title', `%${targetEventId}%`)
          .maybeSingle();

        if (eventByTitle && (eventByTitle as any).id) {
          targetEventId = (eventByTitle as any).id;
          targetEventObj = eventByTitle;
        }
      }
    }
  }

  // 0.0 Strict Registration Deadline & Status Pre-Check before writing to database
  if (targetEventObj) {
    if (targetEventObj.registration_enabled === false) {
      throw new Error('Registration is currently closed for this event.');
    }

    const now = new Date();

    if (targetEventObj.registration_start) {
      const startStr = typeof targetEventObj.registration_start === 'string' ? targetEventObj.registration_start.split('T')[0] : '';
      const [sy, sm, sd] = startStr.split('-').map(Number);
      const startDate = (sy && sm && sd)
        ? new Date(sy, sm - 1, sd, 0, 0, 0, 0)
        : new Date(targetEventObj.registration_start);

      if (startDate > now) {
        throw new Error('Registration for this event has not opened yet.');
      }
    }

    if (targetEventObj.registration_end) {
      const endStr = typeof targetEventObj.registration_end === 'string' ? targetEventObj.registration_end.split('T')[0] : '';
      const [ey, em, ed] = endStr.split('-').map(Number);
      const endDate = (ey && em && ed)
        ? new Date(ey, em - 1, ed, 23, 59, 59, 999)
        : new Date(targetEventObj.registration_end);

      if (endDate < now) {
        throw new Error('Registration for this event has closed.');
      }
    }
  }

  // 0.1 Check for Duplicate UID Registration for this event (Case-Insensitive)
  const rawUids = [uid, ...(team_members || []).map((m) => m.uid)].filter(Boolean) as string[];
  const allUidsNorm = Array.from(
    new Set(rawUids.flatMap((u) => [u.trim(), u.trim().toUpperCase(), u.trim().toLowerCase()]))
  );

  if (allUidsNorm.length > 0 && isSupabaseConfigured()) {
    // Check primary registrations
    const { data: existingReg } = await supabase
      .from('event_registrations')
      .select('registrant_name, uid')
      .eq('event_id', targetEventId)
      .in('uid', allUidsNorm)
      .maybeSingle();

    if (existingReg) {
      throw new Error(`Warning: The University ID (UID: ${(existingReg as any).uid}) has already registered for this event.`);
    }

    // Check team members table for this event
    const { data: existingTeamMember } = await supabase
      .from('event_team_members')
      .select('uid')
      .in('uid', allUidsNorm)
      .maybeSingle();

    if (existingTeamMember) {
      throw new Error(`Warning: The University ID (UID: ${(existingTeamMember as any).uid}) is already registered as a team member for this event.`);
    }
  }

  // 0.2 Check for Duplicate Team Name in this Event (Case-Insensitive)
  if (team_name && team_name.trim() !== '') {
    const trimmedTeamName = team_name.trim();

    if (isSupabaseConfigured()) {
      const { data: existingTeam } = await supabase
        .from('event_teams')
        .select('id, team_name')
        .eq('event_id', targetEventId)
        .ilike('team_name', trimmedTeamName)
        .maybeSingle();

      if (existingTeam) {
        throw new Error(`The team name "${trimmedTeamName}" is already taken for this event. Please choose a different team name.`);
      }
    }

    // Local storage check
    try {
      const localKeys = [`csc_event_regs_${targetEventId}`, 'csc_all_event_regs'];
      for (const k of localKeys) {
        const cached = localStorage.getItem(k);
        if (cached) {
          const list = JSON.parse(cached);
          if (Array.isArray(list)) {
            const conflict = list.find(
              (r) =>
                (r.event_id || '').toLowerCase() === targetEventId.toLowerCase() &&
                r.team &&
                (r.team.team_name || '').trim().toLowerCase() === trimmedTeamName.toLowerCase()
            );
            if (conflict) {
              throw new Error(`The team name "${trimmedTeamName}" is already taken for this event. Please choose a different team name.`);
            }
          }
        }
      }
    } catch (e: any) {
      if (e.message && e.message.includes('already taken')) throw e;
    }
  }

  // 1. Look up if registrant is an existing member by UID or Email (Case-Insensitive)
  let member_id: string | null = payload.member_id || null;
  let is_member = payload.is_member || false;

  const normalizedLeaderUid = uid ? uid.trim().toUpperCase() : null;

  if (!member_id && (normalizedLeaderUid || registrant_email)) {
    if (normalizedLeaderUid) {
      const { data: memByUid } = await supabase
        .from('members')
        .select('id')
        .ilike('uid', normalizedLeaderUid)
        .maybeSingle();

      if (memByUid) {
        member_id = (memByUid as any).id;
        is_member = true;
      }
    }

    if (!member_id && registrant_email) {
      const { data: memByEmail } = await supabase
        .from('members')
        .select('id')
        .ilike('email', registrant_email.trim())
        .maybeSingle();

      if (memByEmail) {
        member_id = (memByEmail as any).id;
        is_member = true;
      }
    }
  }

  const generateRandomCode = (length: number): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const getTeamPrefix = (tName: string, lName: string): string => {
    const cleanTeam = (tName || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const cleanLeader = (lName || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    if (cleanTeam.length >= 2) {
      return cleanTeam.slice(0, 2);
    } else if (cleanTeam.length === 1 && cleanLeader.length >= 1) {
      return cleanTeam[0] + cleanLeader[0];
    }
    return generateRandomCode(2);
  };

  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const isTeamRegistration = Boolean(team_name && team_name.trim() !== '');

  // Pre-generate UUIDs so relations are bound immediately on insert
  const primaryRegistrationId = generateUUID();
  const team_id: string | null = isTeamRegistration ? generateUUID() : null;

  // Shared 2-character team prefix (e.g. AX) for all members of the team
  const teamPrefix = isTeamRegistration ? getTeamPrefix(team_name!, registrant_name) : '';

  // 1. Team Registration ID (e.g. REG-20260819-AXT1IM - 6 chars)
  const teamRegistrationNumber = isTeamRegistration
    ? `REG-${todayStr}-${teamPrefix}${generateRandomCode(4)}`
    : null;

  // 2. Primary Registrant ID (Leader e.g. REG-20260819-AX87KJ or Individual e.g. REG-20260819-Q9K2LP - 6 chars)
  const primaryRegNumber = isTeamRegistration
    ? `REG-${todayStr}-${teamPrefix}${generateRandomCode(4)}`
    : `REG-${todayStr}-${generateRandomCode(6)}`;

  let createdRegistration: EventRegistration;
  let validMembers: any[] = [];

  // 1. Attempt Server-Side Gateway Call (Turnstile + Rate Limiting)
  const workerUrl = import.meta.env.VITE_MEDIA_WORKER_URL || '';
  let rpcRes: any = null;
  let rpcErr: any = null;

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

  if (workerUrl && isUuid) {
    try {
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

      if (response.ok) {
        rpcRes = await response.json();
      } else {
        const errJson = await response.json().catch(() => ({ error: 'Registration failed' }));
        rpcErr = new Error(errJson.error || `Registration failed with status ${response.status}`);
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('Failed to fetch')) {
        rpcErr = err;
      }
    }
  }

  // 2. Direct RPC fallback
  if (!rpcRes && !rpcErr && isSupabaseConfigured() && isUuid) {
    const { data, error } = await supabase.rpc('register_for_event', {
      p_event_id: targetEventId,
      p_registrant_name: registrant_name.trim(),
      p_registrant_email: registrant_email.trim(),
      p_registrant_phone: registrant_phone?.trim() || null,
      p_uid: uid ? uid.trim().toUpperCase() : null,
      p_team_name: team_name?.trim() || null,
      p_team_members: formattedTeamMembers,
      p_answers: formattedAnswers,
    });
    rpcRes = data;
    rpcErr = error;
  }

  if (rpcRes) {
    const parsed = typeof rpcRes === 'string' ? JSON.parse(rpcRes) : rpcRes;
    createdRegistration = {
      id: parsed.id,
      registration_number: parsed.registration_number,
      event_id: targetEventId,
      member_id: member_id || null,
      registrant_name: registrant_name.trim(),
      registrant_email: registrant_email.trim(),
      registrant_phone: registrant_phone?.trim() || null,
      uid: uid ? uid.trim().toUpperCase() : null,
      is_member: is_member || false,
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
          registration_number: `REG-${todayStr}-${teamPrefix}${generateRandomCode(4)}`,
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
  }

  try {
    // 2. If team registration, create event team and team members
    if (isTeamRegistration && isSupabaseConfigured()) {
      const teamPayloadWithRegNum = {
        id: team_id,
        event_id: targetEventId,
        team_name: team_name!.trim(),
        registration_number: teamRegistrationNumber,
        created_by_registration_id: null,
      };

      const { error: teamError } = await supabase
        .from('event_teams')
        .insert(teamPayloadWithRegNum);

      if (teamError) {
        console.warn('Initial team insert with registration_number failed, trying basic insert:', teamError.message);
        const { error: retryError } = await supabase
          .from('event_teams')
          .insert({
            id: team_id,
            event_id: targetEventId,
            team_name: team_name!.trim(),
            created_by_registration_id: null,
          });

        if (retryError) {
          console.error('Fatal team insert error:', retryError.message);
          throw new Error(`Failed to create team: ${retryError.message}`);
        }
      }

      if (team_members && team_members.length > 0) {
        validMembers = await Promise.all(
          team_members.slice(0, 5).map(async (m) => {
            let isMember = false;
            const mUidNorm = m.uid ? m.uid.trim().toUpperCase() : '';
            const mEmailNorm = m.email ? m.email.trim() : '';
            // Each team member gets their 6-char ID starting with the same 2-char team prefix (e.g. REG-20260819-AX91LP)
            const memberRegNumber = `REG-${todayStr}-${teamPrefix}${generateRandomCode(4)}`;

            if (isSupabaseConfigured() && (mUidNorm || mEmailNorm)) {
              if (mUidNorm) {
                const { data: mem } = await supabase
                  .from('members')
                  .select('id')
                  .ilike('uid', mUidNorm)
                  .maybeSingle();
                if (mem) isMember = true;
              }

              if (!isMember && mEmailNorm) {
                const { data: mem } = await supabase
                  .from('members')
                  .select('id')
                  .ilike('email', mEmailNorm)
                  .maybeSingle();
                if (mem) isMember = true;
              }
            }

            return {
              id: generateUUID(),
              team_id,
              name: m.name.trim(),
              email: m.email.trim(),
              phone: m.phone ? m.phone.trim() : null,
              uid: mUidNorm || null,
              registration_number: memberRegNumber,
              is_member: isMember,
            };
          })
        );

        const { error: tmErr } = await supabase.from('event_team_members').insert(validMembers);
        if (tmErr) {
          console.warn('Team members insert with registration_number/phone failed, retrying with basic columns:', tmErr.message);
          const basicMembers = validMembers.map((vm) => ({
            id: vm.id,
            team_id: vm.team_id,
            name: vm.name,
            email: vm.email,
            uid: vm.uid,
            is_member: vm.is_member,
          }));
          await supabase.from('event_team_members').insert(basicMembers);
        }
      }
    } else if (isTeamRegistration) {
      if (team_members && team_members.length > 0) {
        validMembers = team_members.slice(0, 5).map((m) => ({
          id: generateUUID(),
          team_id,
          name: m.name.trim(),
          email: m.email.trim(),
          phone: m.phone ? m.phone.trim() : null,
          uid: m.uid ? m.uid.trim().toUpperCase() : null,
          registration_number: `REG-${todayStr}-${teamPrefix}${generateRandomCode(4)}`,
          is_member: false,
        }));
      }
    }

    // 4. Create primary event registration record
    const regInsertPayload = {
      id: primaryRegistrationId,
      registration_number: primaryRegNumber,
      event_id: targetEventId,
      member_id,
      registrant_name,
      registrant_email,
      registrant_phone: registrant_phone || null,
      uid: uid ? uid.trim().toUpperCase() : null,
      is_member,
      team_id,
      status: 'registered' as const,
    };

    const { data: regData, error: regError } = await supabase
      .from('event_registrations')
      .insert(regInsertPayload)
      .select('*')
      .maybeSingle();

    if (regError) {
      console.warn('Registration insert with select failed, trying direct insert:', regError.message);
      const { error: insertOnlyError } = await supabase
        .from('event_registrations')
        .insert(regInsertPayload);

      if (insertOnlyError) {
        console.error('Fatal registration insert error:', insertOnlyError.message);
        throw new Error(`Registration failed: ${insertOnlyError.message}`);
      }
    }

    createdRegistration = (regData as EventRegistration) || {
      id: primaryRegistrationId,
      registration_number: primaryRegNumber,
      event_id: targetEventId,
      member_id,
      registrant_name,
      registrant_email,
      registrant_phone: registrant_phone || null,
      uid: uid ? uid.trim().toUpperCase() : null,
      is_member,
      team_id,
      status: 'registered',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 5. Ensure team's created_by_registration_id is linked in Supabase
    if (team_id && isSupabaseConfigured()) {
      try {
        await supabase
          .from('event_teams')
          .update({ created_by_registration_id: primaryRegistrationId })
          .eq('id', team_id);
      } catch (e) {}
    }

    // Attach full team object with member registration numbers to returned object
    if (team_id && isTeamRegistration) {
      createdRegistration.team = {
        id: team_id,
        event_id: targetEventId,
        team_name: team_name!.trim(),
        registration_number: teamRegistrationNumber,
        created_by_registration_id: primaryRegistrationId,
        created_at: new Date().toISOString(),
        members: validMembers,
      };

      try {
        localStorage.setItem(`csc_team_${team_id}`, JSON.stringify(createdRegistration.team));
      } catch {}
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
  } catch (err: any) {
    // Clean up / rollback any created team or team members if registration failed
    if (team_id && isSupabaseConfigured()) {
      try {
        await supabase.from('event_team_members').delete().eq('team_id', team_id);
        await supabase.from('event_teams').delete().eq('id', team_id);
      } catch (cleanupErr) {
        console.warn('Failed to rollback orphaned team after registration error:', cleanupErr);
      }
    }
    throw err;
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
