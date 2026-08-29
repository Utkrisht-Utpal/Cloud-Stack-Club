import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { EventRegistrationForm, EventFormField, EventRegistration, Event } from '../types/database';

const LOCAL_FORM_PREFIX = 'csc_event_form_';

const toValidUuid = (str: string): string => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) return str;

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `${hex.slice(0, 8)}-0000-4000-8000-00000000${hex.slice(0, 4)}`.toLowerCase();
};

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

  const validUuid = toValidUuid(eventId);

  try {
    const { data: formData, error: formError } = await supabase
      .from('event_registration_forms')
      .select('*')
      .or(`event_id.eq.${eventId},event_id.eq.${validUuid}`)
      .eq('is_active', true)
      .maybeSingle();

    if (formError || !formData) {
      // Auto-sync: If cached form exists with fields, push to Supabase DB now
      if (cachedForm && cachedForm.fields && cachedForm.fields.length > 0) {
        saveFormForEvent(eventId, cachedForm.fields, cachedForm.title, cachedForm.description || undefined);
      }
      return cachedForm;
    }

    // Fetch form fields ordered by display_order
    const { data: fieldsData } = await supabase
      .from('event_form_fields')
      .select('*')
      .eq('form_id', (formData as any).id)
      .order('display_order', { ascending: true });

    let fieldsList = (fieldsData as EventFormField[]) || [];

    // If Supabase has form record but no fields, and cachedForm has fields, auto-sync cached fields to DB!
    if (fieldsList.length === 0 && cachedForm && cachedForm.fields && cachedForm.fields.length > 0) {
      saveFormForEvent(eventId, cachedForm.fields, formData.title, formData.description || undefined);
      fieldsList = cachedForm.fields;
    }

    const fullForm: EventRegistrationForm = {
      ...(formData as EventRegistrationForm),
      fields: fieldsList,
    };

    // Update local cache
    localStorage.setItem(`${LOCAL_FORM_PREFIX}${eventId}`, JSON.stringify(fullForm));

    return fullForm;
  } catch (err) {
    console.warn('Error in getFormForEvent, using cached version:', err);
    return cachedForm;
  }
};

export const syncAllLocalFormsToSupabase = async (): Promise<void> => {
  if (!isSupabaseConfigured()) return;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOCAL_FORM_PREFIX)) {
        const eventId = key.replace(LOCAL_FORM_PREFIX, '');
        const val = localStorage.getItem(key);
        if (val) {
          try {
            const formObj: EventRegistrationForm = JSON.parse(val);
            if (formObj && formObj.fields && formObj.fields.length > 0) {
              await saveFormForEvent(eventId, formObj.fields, formObj.title, formObj.description || undefined);
            }
          } catch (e) {}
        }
      }
    }
  } catch (err) {
    console.warn('Error syncing local forms to Supabase:', err);
  }
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
    } catch (e) {}
  }

  // 2. Resolve form ID for dbEventId
  let formId = dbEventId;

  if (isSupabaseConfigured()) {
    try {
      const { data: existingForm } = await supabase
        .from('event_registration_forms')
        .select('id')
        .eq('event_id', dbEventId)
        .maybeSingle();

      if (existingForm?.id) {
        formId = existingForm.id;
      }
    } catch (e) {}
  }

  const formattedFields: EventFormField[] = fields.map((f, index) => ({
    id: f.id || `field_${Date.now()}_${index}`,
    form_id: formId,
    field_key: f.field_key || (f.label ? f.label.toLowerCase().replace(/[^a-z0-9]+/g, '_') : `field_${index}`),
    label: f.label || `Custom Question ${index + 1}`,
    field_type: (f.field_type as any) || 'text',
    options: f.options || null,
    placeholder: f.placeholder || null,
    help_text: f.help_text || null,
    required: f.required ?? false,
    display_order: index + 1,
    created_at: now,
  }));

  const formObject: EventRegistrationForm = {
    id: formId,
    event_id: eventId,
    title: formTitle,
    description: formDescription,
    is_active: true,
    created_at: now,
    updated_at: now,
    fields: formattedFields,
  };

  // 1. Instant local storage cache
  localStorage.setItem(`${LOCAL_FORM_PREFIX}${eventId}`, JSON.stringify(formObject));
  if (dbEventId !== eventId) {
    localStorage.setItem(`${LOCAL_FORM_PREFIX}${dbEventId}`, JSON.stringify(formObject));
  }

  // 2. Direct Supabase Persistence
  if (isSupabaseConfigured()) {
    try {
      // Upsert form record in event_registration_forms
      const { data: savedForm, error: formErr } = await supabase
        .from('event_registration_forms')
        .upsert({
          id: formId,
          event_id: dbEventId,
          title: formTitle,
          description: formDescription,
          is_active: true,
          updated_at: now,
        })
        .select('*')
        .maybeSingle();

      if (formErr) {
        if (formErr.message.includes('row-level security') || formErr.code === '42501') {
          throw new Error('Supabase RLS Policy restriction: Please run migration 018 in your Supabase SQL Editor to enable writes on event_registration_forms.');
        }
      }

      const activeFormId = savedForm?.id || formId;

      // Delete existing fields for this form and insert new ones
      const { error: deleteErr } = await supabase.from('event_form_fields').delete().eq('form_id', activeFormId);
      if (deleteErr && (deleteErr.message.includes('row-level security') || deleteErr.code === '42501')) {
        throw new Error('Supabase RLS Policy restriction: Please run migration 018 in your Supabase SQL Editor to enable writes on event_form_fields.');
      }

      if (formattedFields.length > 0) {
        const allowedFieldTypes = new Set(['text', 'textarea', 'email', 'phone', 'number', 'select', 'radio', 'checkbox', 'file', 'date']);

        const fieldsPayload = formattedFields.map((f, idx) => {
          let rawType = (f.field_type as string) || 'text';
          if (!allowedFieldTypes.has(rawType)) {
            rawType = 'text'; // Fallback to 'text' if type is 'url' or unrecognised to pass check constraint
          }

          const rawKey = f.field_key || (f.label ? f.label.toLowerCase().replace(/[^a-z0-9]+/g, '_') : 'field');
          const cleanKey = rawKey.replace(/^_+|_+$/g, '').slice(0, 30) || 'field';
          const uniqueKey = `${cleanKey}_${idx + 1}`;

          return {
            form_id: activeFormId,
            field_key: uniqueKey,
            label: f.label || `Question ${idx + 1}`,
            field_type: rawType as any,
            options: f.options || null,
            placeholder: f.placeholder || null,
            help_text: f.help_text || null,
            required: f.required ?? false,
            display_order: idx + 1,
          };
        });

        const { error: fieldsErr } = await supabase
          .from('event_form_fields')
          .upsert(fieldsPayload, { onConflict: 'form_id,field_key' });

        if (fieldsErr) {
          if (fieldsErr.message.includes('row-level security') || fieldsErr.code === '42501') {
            throw new Error('Supabase RLS Policy restriction: Please run migration 018 in your Supabase SQL Editor to enable writes on event_form_fields.');
          }
        }
      }
    } catch (err) {
      // Clean catch without console clutter
    }
  }

  return formObject;
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

  // 3. Supplement with local storage candidates
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
      } else {
        // Fallback query if RPC not yet created
        const { data } = await supabase
          .from('event_registrations')
          .select('event_id');

        if (data) {
          data.forEach((r) => {
            if (r.event_id) {
              const key = r.event_id.toLowerCase();
              countsMap[key] = (countsMap[key] || 0) + 1;
            }
          });
        }
      }
    } catch (e) {
      console.warn('Error fetching registration counts map:', e);
    }
  }

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

  return countsMap;
};
