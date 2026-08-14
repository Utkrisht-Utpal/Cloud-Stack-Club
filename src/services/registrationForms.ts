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
    const { data: formData, error: formError } = await supabase
      .from('event_registration_forms')
      .select('*')
      .eq('event_id', eventId)
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
    const { data: fieldsData, error: fieldsError } = await supabase
      .from('event_form_fields')
      .select('*')
      .eq('form_id', (formData as any).id)
      .order('display_order', { ascending: true });

    if (fieldsError) {
      console.error(`Error fetching fields for form ${(formData as any).id}:`, fieldsError.message);
    }

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

  // 1. Resolve actual UUID for event if eventId is a slug
  let targetUuid = eventId;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId);
  
  if (isSupabaseConfigured() && !isUuid) {
    try {
      const { data: evt } = await supabase
        .from('events')
        .select('id')
        .eq('slug', eventId)
        .maybeSingle();

      if (evt?.id) {
        targetUuid = evt.id;
      }
    } catch (e) {}
  }

  // 2. Check if an existing form already exists in Supabase for this targetUuid
  let actualFormId = targetUuid;

  if (isSupabaseConfigured()) {
    try {
      const { data: existingForm } = await supabase
        .from('event_registration_forms')
        .select('id')
        .eq('event_id', targetUuid)
        .maybeSingle();

      if (existingForm?.id) {
        actualFormId = existingForm.id;
      }
    } catch (e) {}
  }

  const formattedFields: EventFormField[] = fields.map((f, index) => ({
    id: f.id || `field_${Date.now()}_${index}`,
    form_id: actualFormId,
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
    id: actualFormId,
    event_id: eventId,
    title: formTitle,
    description: formDescription,
    is_active: true,
    created_at: now,
    updated_at: now,
    fields: formattedFields,
  };

  // 1. Instant local persistence
  localStorage.setItem(`${LOCAL_FORM_PREFIX}${eventId}`, JSON.stringify(formObject));
  if (targetUuid !== eventId) {
    localStorage.setItem(`${LOCAL_FORM_PREFIX}${targetUuid}`, JSON.stringify(formObject));
  }

  // 2. Async DB persistence if configured
  if (isSupabaseConfigured()) {
    try {
      // Upsert form record in event_registration_forms
      const { error: formUpsertError } = await supabase
        .from('event_registration_forms')
        .upsert({
          id: actualFormId,
          event_id: targetUuid,
          title: formTitle,
          description: formDescription,
          is_active: true,
          updated_at: now,
        });

      if (formUpsertError) {
        console.error('Error saving event_registration_forms to Supabase:', formUpsertError.message);
      } else {
        // Delete existing fields and insert new ones
        await supabase.from('event_form_fields').delete().eq('form_id', actualFormId);

        if (formattedFields.length > 0) {
          const dbFieldsPayload = formattedFields.map((f, idx) => {
            const isFieldUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(f.id);
            const payload: any = {
              form_id: actualFormId,
              field_key: f.field_key || `field_${idx}`,
              label: f.label || `Question ${idx + 1}`,
              field_type: f.field_type || 'text',
              options: f.options || null,
              placeholder: f.placeholder || null,
              help_text: f.help_text || null,
              required: f.required ?? false,
              display_order: idx + 1,
            };
            if (isFieldUuid) {
              payload.id = f.id;
            }
            return payload;
          });

          const { error: fieldsInsertError } = await supabase
            .from('event_form_fields')
            .insert(dbFieldsPayload);

          if (fieldsInsertError) {
            console.error('Error inserting event_form_fields into Supabase:', fieldsInsertError.message);
          }
        }
      }
    } catch (err) {
      console.error('Could not save form to Supabase:', err);
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
): Promise<{ team_name: string; members: Array<{ name: string; email: string; uid?: string | null }> } | null> => {
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

    if (!team) return null;

    const { data: members } = await supabase
      .from('event_team_members')
      .select('*')
      .eq('team_id', teamId);

    return {
      team_name: (team as any).team_name,
      members: (members as any[]) || [],
    };
  } catch {
    return null;
  }
};
