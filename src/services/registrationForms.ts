import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { EventRegistrationForm, EventFormField, EventRegistration, Event } from '../types/database';

const LOCAL_FORM_PREFIX = 'csc_event_form_';

export const getFormForEvent = async (eventId: string): Promise<EventRegistrationForm | null> => {
  // 1. Try local storage cache first for instant response
  const localData = localStorage.getItem(`${LOCAL_FORM_PREFIX}${eventId}`);
  let cachedForm: EventRegistrationForm | null = null;
  if (localData) {
    try {
      cachedForm = JSON.parse(localData);
    } catch (e) {
      console.warn('Failed to parse local form cache:', e);
    }
  }

  if (!isSupabaseConfigured()) {
    return cachedForm;
  }

  try {
    // Resolve true event UUID from Supabase events table
    let dbEventId = eventId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId);
    if (!isUuid) {
      const { data: dbEvt } = await supabase
        .from('events')
        .select('id')
        .eq('slug', eventId)
        .maybeSingle();
      if (dbEvt?.id) {
        dbEventId = dbEvt.id;
      }
    }

    // Query active form for this event
    const { data: formData, error: formError } = await supabase
      .from('event_registration_forms')
      .select('*')
      .eq('event_id', dbEventId)
      .eq('is_active', true)
      .maybeSingle();

    if (formError) {
      console.warn('Error fetching event_registration_forms from Supabase:', formError.message);
      return cachedForm;
    }

    if (!formData) {
      // No active form configured in database
      const emptyForm: EventRegistrationForm = {
        id: dbEventId,
        event_id: eventId,
        title: 'Event Registration Form',
        description: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        fields: [],
      };
      localStorage.setItem(`${LOCAL_FORM_PREFIX}${eventId}`, JSON.stringify(emptyForm));
      return emptyForm;
    }

    // Fetch form fields ordered by display_order
    const { data: fieldsData, error: fieldsError } = await supabase
      .from('event_form_fields')
      .select('*')
      .eq('form_id', (formData as any).id)
      .order('display_order', { ascending: true });

    if (fieldsError) {
      console.warn('Error fetching event_form_fields from Supabase:', fieldsError.message);
    }

    const fieldsList = (fieldsData as EventFormField[]) || [];

    const fullForm: EventRegistrationForm = {
      ...(formData as EventRegistrationForm),
      fields: fieldsList,
    };

    // Update local read cache with exact database state
    localStorage.setItem(`${LOCAL_FORM_PREFIX}${eventId}`, JSON.stringify(fullForm));
    if (dbEventId !== eventId) {
      localStorage.setItem(`${LOCAL_FORM_PREFIX}${dbEventId}`, JSON.stringify(fullForm));
    }

    return fullForm;
  } catch (err) {
    console.warn('Error in getFormForEvent, using cached version:', err);
    return cachedForm;
  }
};

/**
 * No-op: Removed automatic push of unauthenticated client localStorage to database
 * to prevent unauthorized state manipulation and ensure least-privilege explicit saves.
 */
export const syncAllLocalFormsToSupabase = async (): Promise<void> => {
  // Deliberately no-op for security. Form definitions are saved via explicit admin action.
};

export const saveFormForEvent = async (
  eventId: string,
  fields: Partial<EventFormField>[],
  formTitle: string = 'Event Registration Form',
  formDescription: string = ''
): Promise<EventRegistrationForm> => {
  const now = new Date().toISOString();

  // 1. Resolve event database ID
  let dbEventId: string = eventId;

  if (isSupabaseConfigured()) {
    try {
      const { data: dbEvt } = await supabase
        .from('events')
        .select('id')
        .eq('id', eventId)
        .maybeSingle();

      if (dbEvt?.id) {
        dbEventId = dbEvt.id;
      } else {
        const { data: dbEvtBySlug } = await supabase
          .from('events')
          .select('id')
          .eq('slug', eventId)
          .maybeSingle();

        if (dbEvtBySlug?.id) {
          dbEventId = dbEvtBySlug.id;
        }
      }
    } catch (e) {
      console.warn('Could not resolve event ID in Supabase:', e);
    }
  }

  // 2. Resolve existing form ID for dbEventId
  let activeFormId: string | null = null;

  if (isSupabaseConfigured()) {
    try {
      const { data: existingForm } = await supabase
        .from('event_registration_forms')
        .select('id')
        .eq('event_id', dbEventId)
        .maybeSingle();

      if (existingForm?.id) {
        activeFormId = existingForm.id;
      }
    } catch (e) {
      console.warn('Could not query existing event registration form:', e);
    }
  }

  // 3. Upsert event_registration_forms header with onConflict on event_id
  if (isSupabaseConfigured()) {
    try {
      const formPayload: any = {
        event_id: dbEventId,
        title: formTitle,
        description: formDescription,
        is_active: true,
        updated_at: now,
      };
      if (activeFormId) {
        formPayload.id = activeFormId;
      }

      const { data: savedForm, error: formErr } = await supabase
        .from('event_registration_forms')
        .upsert(formPayload, { onConflict: 'event_id' })
        .select('id, event_id, title, description, is_active, created_at, updated_at')
        .maybeSingle();

      if (formErr) {
        console.error('Error upserting event_registration_forms:', formErr);
        if (formErr.message.includes('row-level security') || formErr.code === '42501') {
          throw new Error('Supabase RLS Policy restriction: Admin permissions required to update event registration forms.');
        }
        throw new Error(formErr.message);
      }

      if (savedForm?.id) {
        activeFormId = savedForm.id;
      }
    } catch (err: any) {
      console.error('Failed to persist form header in Supabase:', err);
      throw err;
    }
  }

  const resolvedFormId = activeFormId || dbEventId;

  // 4. Format fields payload
  const allowedFieldTypes = new Set(['text', 'textarea', 'email', 'phone', 'number', 'select', 'radio', 'checkbox', 'file', 'date']);
  const formattedFields: EventFormField[] = fields.map((f, index) => {
    let rawType = (f.field_type as string) || 'text';
    if (!allowedFieldTypes.has(rawType)) {
      rawType = 'text';
    }
    const rawKey = f.field_key || (f.label ? f.label.toLowerCase().replace(/[^a-z0-9]+/g, '_') : 'field');
    const cleanKey = rawKey.replace(/^_+|_+$/g, '').slice(0, 30) || 'field';
    const uniqueKey = `${cleanKey}_${index + 1}`;

    return {
      id: f.id || `field_${Date.now()}_${index}`,
      form_id: resolvedFormId,
      field_key: uniqueKey,
      label: f.label || `Custom Question ${index + 1}`,
      field_type: rawType as any,
      options: f.options || null,
      placeholder: f.placeholder || null,
      help_text: f.help_text || null,
      required: f.required ?? false,
      display_order: index + 1,
      created_at: now,
    };
  });

  const formObject: EventRegistrationForm = {
    id: resolvedFormId,
    event_id: eventId,
    title: formTitle,
    description: formDescription,
    is_active: true,
    created_at: now,
    updated_at: now,
    fields: formattedFields,
  };

  // 5. Update local storage cache immediately
  localStorage.setItem(`${LOCAL_FORM_PREFIX}${eventId}`, JSON.stringify(formObject));
  if (dbEventId !== eventId) {
    localStorage.setItem(`${LOCAL_FORM_PREFIX}${dbEventId}`, JSON.stringify(formObject));
  }

  // 6. Synchronize fields with Supabase database:
  //    Completely deletes removed questions and upserts/inserts updated questions.
  if (isSupabaseConfigured() && activeFormId) {
    try {
      // Step A: Fetch all existing field rows for this form from DB
      const { data: currentDbFields, error: fetchErr } = await supabase
        .from('event_form_fields')
        .select('id, field_key')
        .eq('form_id', activeFormId);

      if (fetchErr) {
        console.warn('Could not fetch existing fields before update:', fetchErr);
      }

      const existingIdsInDb = (currentDbFields || []).map((row) => row.id);

      // If user has 0 fields remaining (deleted all custom questions):
      if (formattedFields.length === 0) {
        if (existingIdsInDb.length > 0) {
          const { error: delAllErr } = await supabase
            .from('event_form_fields')
            .delete()
            .eq('form_id', activeFormId);

          if (delAllErr) {
            console.error('Error deleting all fields for form:', delAllErr);
            throw new Error(delAllErr.message);
          }
        }
      } else {
        // Find which existing DB fields are no longer present in the updated list
        const incomingDbIds = new Set(
          formattedFields
            .map((f) => f.id)
            .filter((id) => id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
        );

        // Any ID in DB that is not in the incoming list MUST be deleted!
        const idsToDelete = existingIdsInDb.filter((dbId) => !incomingDbIds.has(dbId));

        if (idsToDelete.length > 0) {
          const { error: delErr } = await supabase
            .from('event_form_fields')
            .delete()
            .in('id', idsToDelete);

          if (delErr) {
            console.warn('Could not delete fields by ID, attempting delete by form_id:', delErr.message);
            // Fallback: Delete all old fields for form and insert new ones fresh
            await supabase.from('event_form_fields').delete().eq('form_id', activeFormId);
          }
        }

        // Prepare clean fields payload for insert / upsert
        const fieldsPayload = formattedFields.map((f, idx) => {
          const payloadItem: any = {
            form_id: activeFormId,
            field_key: f.field_key,
            label: f.label,
            field_type: f.field_type,
            options: f.options || null,
            placeholder: f.placeholder || null,
            help_text: f.help_text || null,
            required: f.required ?? false,
            display_order: idx + 1,
          };
          if (f.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(f.id)) {
            payloadItem.id = f.id;
          }
          return payloadItem;
        });

        const { error: upsertErr } = await supabase
          .from('event_form_fields')
          .upsert(fieldsPayload, { onConflict: 'form_id,field_key' });

        if (upsertErr) {
          console.error('Error upserting event_form_fields:', upsertErr);
          if (upsertErr.message.includes('row-level security') || upsertErr.code === '42501') {
            throw new Error('Supabase RLS Policy restriction: Admin permissions required to update event form fields.');
          }
          throw new Error(upsertErr.message);
        }
      }

      // Step B: Re-fetch clean list from DB to update local cache with exact DB UUIDs
      const { data: freshFields } = await supabase
        .from('event_form_fields')
        .select('*')
        .eq('form_id', activeFormId)
        .order('display_order', { ascending: true });

      if (freshFields) {
        formObject.fields = freshFields as EventFormField[];
        localStorage.setItem(`${LOCAL_FORM_PREFIX}${eventId}`, JSON.stringify(formObject));
        if (dbEventId !== eventId) {
          localStorage.setItem(`${LOCAL_FORM_PREFIX}${dbEventId}`, JSON.stringify(formObject));
        }
      }
    } catch (err: any) {
      console.error('Database field synchronization error:', err);
      throw err;
    }
  }

  // Broadcast update event to all listening components
  window.dispatchEvent(new CustomEvent('csc-event-form-updated', { detail: { eventId, form: formObject } }));

  return formObject;
};

/**
 * Deletes a single field directly from Supabase and local cache.
 */
export const deleteFormFieldDirectly = async (
  fieldId: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> => {
  if (isSupabaseConfigured() && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fieldId)) {
    try {
      const { error } = await supabase.from('event_form_fields').delete().eq('id', fieldId);
      if (error) {
        console.error('Error deleting form field directly from Supabase:', error);
        return { success: false, error: error.message };
      }
    } catch (err: any) {
      console.error('Exception deleting form field directly:', err);
      return { success: false, error: err?.message || 'Failed to delete question from database.' };
    }
  }

  // Also update local cache
  const localData = localStorage.getItem(`${LOCAL_FORM_PREFIX}${eventId}`);
  if (localData) {
    try {
      const parsed: EventRegistrationForm = JSON.parse(localData);
      if (parsed && Array.isArray(parsed.fields)) {
        parsed.fields = parsed.fields.filter((f) => f.id !== fieldId);
        localStorage.setItem(`${LOCAL_FORM_PREFIX}${eventId}`, JSON.stringify(parsed));
      }
    } catch (e) {}
  }

  window.dispatchEvent(new CustomEvent('csc-event-form-updated', { detail: { eventId } }));
  return { success: true };
};

export const getEventRegistrationsService = async (
  eventOrId: string | Event
): Promise<EventRegistration[]> => {
  const targetId = typeof eventOrId === 'string' ? eventOrId : eventOrId.id;
  const targetSlug = typeof eventOrId === 'object' && eventOrId.slug ? eventOrId.slug : null;
  const targetTitle = typeof eventOrId === 'object' && eventOrId.title ? eventOrId.title : '';

  const knownIdentifiers = new Set<string>();
  if (targetId) knownIdentifiers.add(targetId.toLowerCase());
  if (targetSlug) knownIdentifiers.add(targetSlug.toLowerCase());

  // 1. Resolve event UUIDs from Supabase events table
  if (isSupabaseConfigured()) {
    try {
      const { data: dbEvents } = await supabase
        .from('events')
        .select('id, slug, title');

      if (dbEvents) {
        const cleanTitle = targetTitle.toLowerCase().trim();
        dbEvents.forEach((evt) => {
          const evtTitle = (evt.title || '').toLowerCase().trim();
          const evtSlug = (evt.slug || '').toLowerCase().trim();
          const evtId = (evt.id || '').toLowerCase().trim();

          const matches =
            (targetId && (evtId === targetId.toLowerCase() || evtSlug === targetId.toLowerCase())) ||
            (targetSlug && (evtId === targetSlug.toLowerCase() || evtSlug === targetSlug.toLowerCase())) ||
            (cleanTitle && (evtTitle.includes(cleanTitle) || cleanTitle.includes(evtTitle)));

          if (matches) {
            if (evt.id) knownIdentifiers.add(evt.id.toLowerCase());
            if (evt.slug) knownIdentifiers.add(evt.slug.toLowerCase());
          }
        });
      }
    } catch (e) {
      console.warn('Error resolving events from DB:', e);
    }
  }

  const candidateMap = new Map<string, EventRegistration>();

  // 2. Query ALL registrations from Supabase directly
  if (isSupabaseConfigured()) {
    try {
      const { data: remoteRegs, error: regErr } = await supabase
        .from('event_registrations')
        .select('*');

      if (regErr) {
        console.error('Error querying event_registrations from Supabase:', regErr.message);
      }

      if (remoteRegs && remoteRegs.length > 0) {
        // Also fetch all event_teams to match team_id
        const { data: allTeams } = await supabase.from('event_teams').select('*');
        const teamEventMap = new Map<string, string>();
        if (allTeams) {
          allTeams.forEach((t) => {
            if (t.id && t.event_id) teamEventMap.set(t.id, t.event_id.toLowerCase());
          });
        }

        remoteRegs.forEach((r) => {
          const regEventId = (r.event_id || '').toLowerCase();
          const teamEventId = r.team_id ? teamEventMap.get(r.team_id) : null;

          const matchesEvent =
            (regEventId && knownIdentifiers.has(regEventId)) ||
            (teamEventId && knownIdentifiers.has(teamEventId));

          if (matchesEvent) {
            const key = r.registration_number || r.id;
            if (key) candidateMap.set(key, r as EventRegistration);
          }
        });
      }
    } catch (err) {
      console.error('Exception fetching registrations from Supabase:', err);
    }
  }

  // 3. Supplement with local storage candidates ONLY if offline or no remote records found
  if (!isSupabaseConfigured() || candidateMap.size === 0) {
    const localKeys = [
      `csc_event_regs_${targetId}`,
      targetSlug ? `csc_event_regs_${targetSlug}` : null,
      'csc_all_event_regs',
    ].filter(Boolean) as string[];

    for (const key of localKeys) {
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          parsed.forEach((r: EventRegistration) => {
            if (r && r.event_id) {
              const regEventId = r.event_id.toLowerCase();
              if (knownIdentifiers.has(regEventId)) {
                const dedupKey = r.registration_number || r.id;
                if (dedupKey && !candidateMap.has(dedupKey)) {
                  candidateMap.set(dedupKey, r);
                }
              }
            }
          });
        }
      } catch (e) {}
    }
  }
  }

  // 4. Sort registrations chronologically (oldest first: 1, 2, 3...)
  const resultList = Array.from(candidateMap.values());
  resultList.sort((a, b) => {
    const timeA = new Date(a.submitted_at || (a as any).created_at || 0).getTime();
    const timeB = new Date(b.submitted_at || (b as any).created_at || 0).getTime();
    return timeA - timeB;
  });

  return resultList;
};

export const getTeamDetailsForRegistration = async (
  teamId: string
): Promise<{
  team_name: string;
  registration_number?: string | null;
  members: Array<{
    name: string;
    email: string;
    phone?: string | null;
    uid?: string | null;
    department?: string | null;
    year?: string | null;
    registration_number?: string | null;
  }>;
} | null> => {
  if (!isSupabaseConfigured()) {
    const localTeam = localStorage.getItem(`csc_team_${teamId}`);
    return localTeam ? JSON.parse(localTeam) : null;
  }

  try {
    const { data: team } = await supabase
      .from('event_teams')
      .select('*')
      .eq('id', teamId)
      .maybeSingle();

    if (!team) {
      const localTeam = localStorage.getItem(`csc_team_${teamId}`);
      return localTeam ? JSON.parse(localTeam) : null;
    }

    const { data: members } = await supabase
      .from('event_team_members')
      .select('*')
      .eq('team_id', teamId);

    return {
      team_name: (team as any).team_name,
      registration_number: (team as any).registration_number || null,
      members: (members as any[]) || [],
    };
  } catch {
    const localTeam = localStorage.getItem(`csc_team_${teamId}`);
    return localTeam ? JSON.parse(localTeam) : null;
  }
};

export const getRegistrationAnswersForEvent = async (
  registrationIds: string[]
): Promise<Record<string, Record<string, string>>> => {
  const result: Record<string, Record<string, string>> = {};
  if (!registrationIds || registrationIds.length === 0) return result;

  if (isSupabaseConfigured()) {
    try {
      const { data: answers } = await supabase
        .from('registration_answers')
        .select('*')
        .in('registration_id', registrationIds);

      if (answers) {
        answers.forEach((ans) => {
          if (!result[ans.registration_id]) {
            result[ans.registration_id] = {};
          }
          const val = ans.answer_text || (ans.answer_json ? JSON.stringify(ans.answer_json) : (ans.file_url || ''));
          result[ans.registration_id][ans.field_id] = val;
        });
      }
    } catch (e) {}
  }

  // Supplement from local storage
  registrationIds.forEach((regId) => {
    const localAns = localStorage.getItem(`csc_answers_${regId}`);
    if (localAns) {
      try {
        const parsed = JSON.parse(localAns);
        if (Array.isArray(parsed)) {
          if (!result[regId]) result[regId] = {};
          parsed.forEach((a: any) => {
            const val = a.answer_text || (a.answer_json ? JSON.stringify(a.answer_json) : (a.file_url || ''));
            result[regId][a.field_id] = val;
          });
        }
      } catch (e) {}
    }
  });

  return result;
};

export const getEventRegistrationCountsMap = async (): Promise<Record<string, number>> => {
  const countsMap: Record<string, number> = {};

  if (isSupabaseConfigured()) {
    try {
      // 1. Query aggregate counts via secure RPC (Zero student PII exposure)
      const { data: rpcCounts, error: rpcError } = await supabase.rpc('get_event_registration_counts');
      if (!rpcError && rpcCounts) {
        const countsObj = typeof rpcCounts === 'string' ? JSON.parse(rpcCounts) : rpcCounts;
        if (countsObj && typeof countsObj === 'object') {
          Object.keys(countsObj).forEach((eventId) => {
            if (eventId) {
              countsMap[eventId.toLowerCase()] = Number(countsObj[eventId]) || 0;
            }
          });
        }
      }
    } catch (e) {
      console.warn('Error fetching registration counts map from Supabase RPC:', e);
    }
  }

  // 2. Worker Gateway Fallback
  if (Object.keys(countsMap).length === 0) {
    const workerUrl = import.meta.env.VITE_MEDIA_WORKER_URL || '';
    if (workerUrl) {
      try {
        const res = await fetch(`${workerUrl}/api/event-registration-counts`);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object') {
            Object.keys(data).forEach((eventId) => {
              if (eventId) {
                countsMap[eventId.toLowerCase()] = Number(data[eventId]) || 0;
              }
            });
          }
        }
      } catch (err) {
        console.warn('Error fetching counts from worker gateway:', err);
      }
    }
  }

  // 3. Fallback to localStorage ONLY if completely offline / both Supabase and Worker failed
  if (Object.keys(countsMap).length === 0) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('csc_event_regs_') || k.startsWith('csc_regs_'))) {
          const val = localStorage.getItem(k);
          if (val) {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const eventKey = k.replace('csc_event_regs_', '').replace('csc_regs_', '').toLowerCase();
              countsMap[eventKey] = Math.max(countsMap[eventKey] || 0, parsed.length);
            }
          }
        }
      }
    } catch {}
  }

  return countsMap;
};
