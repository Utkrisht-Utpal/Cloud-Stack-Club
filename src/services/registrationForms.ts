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

    const fullForm: EventRegistrationForm = {
      ...(formData as EventRegistrationForm),
      fields: (fieldsData as EventFormField[]) || [],
    };

    // Update local cache
    localStorage.setItem(`${LOCAL_FORM_PREFIX}${eventId}`, JSON.stringify(fullForm));

    return fullForm;
  } catch (err) {
    console.warn('Error in getFormForEvent, using cached version:', err);
    return cachedForm;
  }
};

export const saveFormForEvent = async (
  eventId: string,
  fields: Partial<EventFormField>[],
  formTitle: string = 'Event Registration Form',
  formDescription: string = ''
): Promise<EventRegistrationForm> => {
  const formId = `form_${eventId}`;
  const now = new Date().toISOString();

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

  // 1. Instant local persistence
  localStorage.setItem(`${LOCAL_FORM_PREFIX}${eventId}`, JSON.stringify(formObject));

  // 2. Async DB persistence if configured
  if (isSupabaseConfigured()) {
    try {
      // Upsert form record
      const { error: formUpsertError } = await supabase
        .from('event_registration_forms')
        .upsert({
          id: formId,
          event_id: eventId,
          title: formTitle,
          description: formDescription,
          is_active: true,
          updated_at: now,
        });

      if (!formUpsertError) {
        // Delete existing fields and insert new ones
        await supabase.from('event_form_fields').delete().eq('form_id', formId);

        if (formattedFields.length > 0) {
          await supabase.from('event_form_fields').insert(
            formattedFields.map((f) => ({
              id: f.id,
              form_id: f.form_id,
              field_key: f.field_key,
              label: f.label,
              field_type: f.field_type,
              options: f.options,
              placeholder: f.placeholder,
              help_text: f.help_text,
              required: f.required,
              display_order: f.display_order,
            }))
          );
        }
      }
    } catch (err) {
      console.warn('Could not save form to Supabase:', err);
    }
  }

  return formObject;
};

export const getEventRegistrationsService = async (
  eventOrId: string | Event
): Promise<EventRegistration[]> => {
  const targetId = typeof eventOrId === 'string' ? eventOrId : eventOrId.id;
  const targetSlug = typeof eventOrId === 'object' && eventOrId.slug ? eventOrId.slug : null;

  const queryIds = Array.from(new Set([targetId, targetSlug].filter(Boolean))) as string[];

  // 1. Gather all local cache registrations
  const localKeys = [
    `csc_event_regs_${targetId}`,
    targetSlug ? `csc_event_regs_${targetSlug}` : null,
    'csc_all_event_regs',
  ].filter(Boolean) as string[];

  const allCandidateRegs: any[] = [];

  for (const key of localKeys) {
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          allCandidateRegs.push(...parsed);
        }
      } catch (e) {}
    }
  }

  if (isSupabaseConfigured()) {
    try {
      // Fetch all registrations from Supabase (to avoid missing any due to event_id formatting/slug/UUID differences)
      const { data: remoteData, error: remoteError } = await supabase
        .from('event_registrations')
        .select('*');

      if (!remoteError && remoteData && remoteData.length > 0) {
        allCandidateRegs.push(...remoteData);
      } else {
        // Fallback filtered query by queryIds
        const { data: filteredData } = await supabase
          .from('event_registrations')
          .select('*')
          .in('event_id', queryIds);
        if (filteredData) {
          allCandidateRegs.push(...filteredData);
        }
      }
    } catch (err) {
      console.warn('Exception in fetching remote registrations:', err);
    }
  }

  // Filter candidates matching targetId/targetSlug or fallback IDs
  const matchedRegs = allCandidateRegs.filter((r) => {
    if (!r) return false;
    if (!r.event_id) return true; // Include if unassigned
    if (queryIds.includes(r.event_id)) return true;
    if (r.event_id === '00000000-0000-0000-0000-000000000001') return true;
    return false;
  });

  // Deduplicate by registration_number or ID
  const map = new Map<string, EventRegistration>();
  const regsToUse = matchedRegs.length > 0 ? matchedRegs : allCandidateRegs;

  regsToUse.forEach((r) => {
    const dedupKey = r.registration_number || r.id;
    if (dedupKey && !map.has(dedupKey)) {
      map.set(dedupKey, r as EventRegistration);
    }
  });

  return Array.from(map.values());
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
