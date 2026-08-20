import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { ContactFeedback, EventFeedback, FeedbackStatus } from '../types/database';

/* =========================================================================
   1. CONTACT FORM FEEDBACK SERVICES (Table: contact_feedbacks)
   ========================================================================= */

export interface SubmitFeedbackPayload {
  name: string;
  email: string;
  message: string;
}

const LOCAL_CONTACT_FEEDBACKS_KEY = 'csc_contact_feedbacks';

export const submitFeedback = async (
  payload: SubmitFeedbackPayload
): Promise<ContactFeedback> => {
  const tempId = 'fb-' + Date.now();
  const newFeedback: ContactFeedback = {
    id: tempId,
    name: payload.name.trim(),
    email: payload.email.trim(),
    message: payload.message.trim(),
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) {
    try {
      const existing = localStorage.getItem(LOCAL_CONTACT_FEEDBACKS_KEY);
      const list: ContactFeedback[] = existing ? JSON.parse(existing) : [];
      list.unshift(newFeedback);
      localStorage.setItem(LOCAL_CONTACT_FEEDBACKS_KEY, JSON.stringify(list));
    } catch (e) {}
    return newFeedback;
  }

  try {
    const insertObj = {
      name: payload.name.trim(),
      email: payload.email.trim(),
      message: payload.message.trim(),
      status: 'pending' as FeedbackStatus,
    };

    const { data, error } = await supabase
      .from('contact_feedbacks')
      .insert(insertObj)
      .select('*')
      .maybeSingle();

    if (!error && data) {
      const dbFeedback = data as ContactFeedback;
      try {
        const existing = localStorage.getItem(LOCAL_CONTACT_FEEDBACKS_KEY);
        let list: ContactFeedback[] = existing ? JSON.parse(existing) : [];
        list = list.filter((f) => f.id !== tempId && f.id !== dbFeedback.id);
        list.unshift(dbFeedback);
        localStorage.setItem(LOCAL_CONTACT_FEEDBACKS_KEY, JSON.stringify(list));
      } catch (e) {}
      return dbFeedback;
    }
  } catch (e) {}

  return newFeedback;
};

export const fetchFreshContactFeedbacksFromDb = async (): Promise<ContactFeedback[]> => {
  if (!isSupabaseConfigured()) {
    const cached = localStorage.getItem(LOCAL_CONTACT_FEEDBACKS_KEY);
    return cached ? JSON.parse(cached) : [];
  }

  const { data, error } = await supabase
    .from('contact_feedbacks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching contact feedbacks from database:', error);
    throw error;
  }

  const rawDbList = (data as any[]) || [];
  const dbList: ContactFeedback[] = rawDbList
    .filter((f) => !f.event_id && !f.event_title && f.feedback_type !== 'event')
    .map((f) => ({
      id: f.id,
      name: f.name,
      email: f.email,
      message: f.message,
      status: f.status || 'pending',
      created_at: f.created_at,
    }));

  try {
    localStorage.setItem(LOCAL_CONTACT_FEEDBACKS_KEY, JSON.stringify(dbList));
  } catch (e) {}

  return dbList;
};

export const getAllFeedbacks = async (): Promise<ContactFeedback[]> => {
  let localList: ContactFeedback[] = [];

  try {
    const cached = localStorage.getItem(LOCAL_CONTACT_FEEDBACKS_KEY);
    if (cached) {
      localList = (JSON.parse(cached) as any[]).filter(
        (f) => !f.event_id && !f.event_title && f.feedback_type !== 'event'
      );
    }
  } catch (e) {}

  if (!isSupabaseConfigured()) {
    return localList;
  }

  try {
    const dbList = await fetchFreshContactFeedbacksFromDb();
    return dbList;
  } catch (e) {
    return localList;
  }
};

export const updateFeedbackStatus = async (
  id: string,
  status: FeedbackStatus
): Promise<boolean> => {
  try {
    const cached = localStorage.getItem(LOCAL_CONTACT_FEEDBACKS_KEY);
    if (cached) {
      const list: ContactFeedback[] = JSON.parse(cached);
      const updated = list.map((f) => (f.id === id ? { ...f, status } : f));
      localStorage.setItem(LOCAL_CONTACT_FEEDBACKS_KEY, JSON.stringify(updated));
    }
  } catch (e) {}

  if (!isSupabaseConfigured()) {
    return true;
  }

  try {
    const { error } = await supabase
      .from('contact_feedbacks')
      .update({ status })
      .eq('id', id);

    return !error;
  } catch (e) {
    return false;
  }
};

/* =========================================================================
   2. EVENT-SPECIFIC FEEDBACK SERVICES (Table: event_feedbacks)
   ========================================================================= */

export interface SubmitEventFeedbackPayload {
  name: string;
  email: string;
  phone?: string;
  university_id: string;
  registration_id: string;
  event_id: string;
  event_title: string;
  event_rating: number;
  engagement_rating?: number;
  coordination_rating: string;
  message: string;
}

const LOCAL_EVENT_FEEDBACKS_KEY = 'csc_event_feedbacks';

export const submitEventFeedback = async (
  payload: SubmitEventFeedbackPayload
): Promise<EventFeedback> => {
  const tempId = 'efb-' + Date.now();
  const newEventFeedback: EventFeedback = {
    id: tempId,
    name: payload.name.trim(),
    email: payload.email.trim(),
    phone: payload.phone?.trim() || undefined,
    university_id: payload.university_id.trim(),
    registration_id: payload.registration_id.trim(),
    event_id: payload.event_id.trim(),
    event_title: payload.event_title.trim(),
    event_rating: payload.event_rating,
    engagement_rating: payload.engagement_rating,
    coordination_rating: payload.coordination_rating.trim(),
    message: payload.message.trim(),
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) {
    try {
      const existing = localStorage.getItem(LOCAL_EVENT_FEEDBACKS_KEY);
      const list: EventFeedback[] = existing ? JSON.parse(existing) : [];
      list.unshift(newEventFeedback);
      localStorage.setItem(LOCAL_EVENT_FEEDBACKS_KEY, JSON.stringify(list));
    } catch (e) {}
    return newEventFeedback;
  }

  try {
    const insertObj: any = {
      name: payload.name.trim(),
      email: payload.email.trim(),
      phone: payload.phone?.trim() || null,
      university_id: payload.university_id.trim(),
      registration_id: payload.registration_id.trim(),
      event_id: payload.event_id.trim(),
      event_title: payload.event_title.trim(),
      event_rating: payload.event_rating,
      coordination_rating: payload.coordination_rating.trim(),
      message: payload.message.trim(),
      status: 'pending' as FeedbackStatus,
    };

    if (payload.engagement_rating !== undefined) {
      insertObj.engagement_rating = payload.engagement_rating;
    }

    const { data, error } = await supabase
      .from('event_feedbacks')
      .insert(insertObj)
      .select('*')
      .maybeSingle();

    if (error) {
      console.warn('Supabase event feedback insert error:', error);
      // Fallback local save if database schema lacks newly added columns
      const existing = localStorage.getItem(LOCAL_EVENT_FEEDBACKS_KEY);
      const list: EventFeedback[] = existing ? JSON.parse(existing) : [];
      list.unshift(newEventFeedback);
      localStorage.setItem(LOCAL_EVENT_FEEDBACKS_KEY, JSON.stringify(list));
      return newEventFeedback;
    }

    // Cache locally
    try {
      const existing = localStorage.getItem(LOCAL_EVENT_FEEDBACKS_KEY);
      const list: EventFeedback[] = existing ? JSON.parse(existing) : [];
      list.unshift(data || newEventFeedback);
      localStorage.setItem(LOCAL_EVENT_FEEDBACKS_KEY, JSON.stringify(list));
    } catch (e) {}

    return data || newEventFeedback;
  } catch (err: any) {
    console.error('Error in submitEventFeedback:', err);
    return newEventFeedback;
  }
};

export const fetchFreshEventFeedbacksFromDb = async (): Promise<EventFeedback[]> => {
  if (!isSupabaseConfigured()) {
    const cached = localStorage.getItem(LOCAL_EVENT_FEEDBACKS_KEY);
    return cached ? JSON.parse(cached) : [];
  }

  let dbList: EventFeedback[] = [];

  // Attempt joined query with events table via event_id foreign key
  const { data, error } = await supabase
    .from('event_feedbacks')
    .select('*, events:event_id(id, title, status, date, location)')
    .order('created_at', { ascending: false });

  if (!error && data) {
    dbList = (data as any[]).map((f) => ({
      id: f.id,
      name: f.name,
      email: f.email,
      phone: f.phone,
      university_id: f.university_id,
      registration_id: f.registration_id,
      event_id: f.event_id,
      event_title: f.events?.title || f.event_title || 'Event',
      event_rating: f.event_rating,
      engagement_rating: f.engagement_rating,
      coordination_rating: f.coordination_rating,
      message: f.message,
      status: f.status || 'pending',
      created_at: f.created_at,
    }));
  } else {
    // Fallback simple query if join alias differs
    const { data: simpleData, error: simpleError } = await supabase
      .from('event_feedbacks')
      .select('*')
      .order('created_at', { ascending: false });

    if (simpleError) {
      console.error('Error fetching event feedbacks from database:', simpleError);
      throw simpleError;
    }

    if (simpleData) {
      dbList = simpleData as EventFeedback[];
    }
  }

  try {
    localStorage.setItem(LOCAL_EVENT_FEEDBACKS_KEY, JSON.stringify(dbList));
  } catch (e) {}

  return dbList;
};

export const getAllEventFeedbacks = async (): Promise<EventFeedback[]> => {
  let localList: EventFeedback[] = [];

  try {
    const cached = localStorage.getItem(LOCAL_EVENT_FEEDBACKS_KEY);
    if (cached) {
      localList = JSON.parse(cached);
    }
  } catch (e) {}

  if (!isSupabaseConfigured()) {
    return localList;
  }

  try {
    const dbList = await fetchFreshEventFeedbacksFromDb();
    return dbList;
  } catch (e) {
    return localList;
  }
};

export const updateEventFeedbackStatus = async (
  id: string,
  status: FeedbackStatus
): Promise<boolean> => {
  try {
    const cached = localStorage.getItem(LOCAL_EVENT_FEEDBACKS_KEY);
    if (cached) {
      const list: EventFeedback[] = JSON.parse(cached);
      const updated = list.map((f) => (f.id === id ? { ...f, status } : f));
      localStorage.setItem(LOCAL_EVENT_FEEDBACKS_KEY, JSON.stringify(updated));
    }
  } catch (e) {}

  if (!isSupabaseConfigured()) {
    return true;
  }

  try {
    const { error } = await supabase
      .from('event_feedbacks')
      .update({ status })
      .eq('id', id);

    return !error;
  } catch (e) {
    return false;
  }
};

/* =========================================================================
   3. EVENT REGISTRATION & UID STRICT BINDING VERIFICATION
   ========================================================================= */

export interface VerifyEventRegistrationResult {
  isValid: boolean;
  error?: string;
  registrantName?: string;
  registrantEmail?: string;
  registrantPhone?: string;
  isTeamMember?: boolean;
  teamName?: string;
}

/**
 * Validates that the entered Registration ID and University ID (UID) are strictly bound
 * and belong to the same attendee for the specified event.
 */
export const verifyEventRegistration = async (
  eventId: string,
  universityId: string,
  registrationId: string
): Promise<VerifyEventRegistrationResult> => {
  const normUid = (universityId || '').trim().toUpperCase();
  const normReg = (registrationId || '').trim().toUpperCase();

  if (!normUid || !normReg) {
    return {
      isValid: false,
      error: 'Both University ID (UID) and Registration ID are required.',
    };
  }

  // 1. Resolve targetEventId UUID if slug or title passed
  let targetEventId = eventId;
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

  // 2. Query Supabase database for exact binding
  if (isSupabaseConfigured()) {
    try {
      // 2.1 Check primary registrations table (Individual Registrants & Team Leaders)
      const { data: primaryRegs, error: pError } = await supabase
        .from('event_registrations')
        .select('id, event_id, uid, registration_number, registrant_name, registrant_email, registrant_phone, team_id')
        .eq('event_id', targetEventId);

      if (!pError && primaryRegs && primaryRegs.length > 0) {
        // Test 1: Exact match for UID and Registration ID in primary registrations
        const exactMatch = primaryRegs.find(
          (r) =>
            (r.registration_number || '').trim().toUpperCase() === normReg &&
            (r.uid || '').trim().toUpperCase() === normUid
        );

        if (exactMatch) {
          return {
            isValid: true,
            registrantName: exactMatch.registrant_name,
            registrantEmail: exactMatch.registrant_email,
            registrantPhone: exactMatch.registrant_phone || undefined,
            isTeamMember: false,
          };
        }
      }

      // 2.2 Check team members table (Teammates & Team Registration Numbers)
      const { data: teamsForEvent } = await supabase
        .from('event_teams')
        .select('id, team_name, registration_number')
        .eq('event_id', targetEventId);

      if (teamsForEvent && teamsForEvent.length > 0) {
        const teamIds = teamsForEvent.map((t) => t.id);
        const { data: tmData, error: tmError } = await supabase
          .from('event_team_members')
          .select('id, team_id, name, email, phone, uid, registration_number')
          .in('team_id', teamIds);

        const teamMembers = (!tmError && tmData) ? tmData : [];

        if (teamMembers.length > 0) {
          // Exact match with individual team member registration number
          const exactMember = teamMembers.find(
            (m) =>
              (m.registration_number || '').trim().toUpperCase() === normReg &&
              (m.uid || '').trim().toUpperCase() === normUid
          );

          if (exactMember) {
            const teamObj = teamsForEvent.find((t) => t.id === exactMember.team_id);
            return {
              isValid: true,
              registrantName: exactMember.name,
              registrantEmail: exactMember.email,
              registrantPhone: exactMember.phone || undefined,
              isTeamMember: true,
              teamName: teamObj?.team_name,
            };
          }

          // Check if normReg is the Team Registration ID (e.g. REG-20260819-AXT1IM)
          const teamByReg = teamsForEvent.find(
            (t: any) => (t.registration_number || '').trim().toUpperCase() === normReg
          );

          if (teamByReg) {
            // Check if UID is the leader of this team
            const leaderMatch = primaryRegs?.find(
              (r) => r.team_id === teamByReg.id && (r.uid || '').trim().toUpperCase() === normUid
            );
            if (leaderMatch) {
              return {
                isValid: true,
                registrantName: leaderMatch.registrant_name,
                registrantEmail: leaderMatch.registrant_email,
                registrantPhone: leaderMatch.registrant_phone || undefined,
                isTeamMember: false,
                teamName: teamByReg.team_name,
              };
            }

            // Check if UID is a teammate in this team
            const memberMatch = teamMembers.find(
              (m) => m.team_id === teamByReg.id && (m.uid || '').trim().toUpperCase() === normUid
            );
            if (memberMatch) {
              return {
                isValid: true,
                registrantName: memberMatch.name,
                registrantEmail: memberMatch.email,
                registrantPhone: memberMatch.phone || undefined,
                isTeamMember: true,
                teamName: teamByReg.team_name,
              };
            }
          }
        }
      }

      // If no valid match was found, return a generic error without exposing any IDs
      return {
        isValid: false,
        error: `The entered UID or Registration ID is not associated with this event. Please verify your details.`,
      };
    } catch (err) {
      console.warn('Error during event registration verification against Supabase:', err);
    }
  }

  // 3. Offline / Local Storage fallback verification
  try {
    const localKeys = [`csc_event_regs_${targetEventId}`, 'csc_all_event_regs'];
    for (const key of localKeys) {
      const cached = localStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const match = parsed.find(
            (r) =>
              (r.event_id || '').toLowerCase() === targetEventId.toLowerCase() &&
              (r.registration_number || '').trim().toUpperCase() === normReg &&
              (r.uid || '').trim().toUpperCase() === normUid
          );
          if (match) {
            return {
              isValid: true,
              registrantName: match.registrant_name,
              registrantEmail: match.registrant_email,
            };
          }
        }
      }
    }
  } catch {}

  // If Supabase is not configured and no local cache, allow submission
  return { isValid: true };
};

/**
 * Checks whether feedback has already been submitted for this event by the given UID or Registration ID.
 */
export const checkExistingFeedbackForEvent = async (
  eventId: string,
  universityId: string,
  registrationId: string
): Promise<{ alreadySubmitted: boolean }> => {
  const normUid = (universityId || '').trim().toUpperCase();
  const normReg = (registrationId || '').trim().toUpperCase();

  if (!normUid && !normReg) return { alreadySubmitted: false };

  if (isSupabaseConfigured()) {
    try {
      const { data: existingFeedbacks, error } = await supabase
        .from('event_feedbacks')
        .select('id, university_id, registration_id')
        .eq('event_id', eventId);

      if (!error && existingFeedbacks && existingFeedbacks.length > 0) {
        const duplicate = existingFeedbacks.some(
          (f) =>
            (f.university_id && f.university_id.trim().toUpperCase() === normUid) ||
            (f.registration_id && f.registration_id.trim().toUpperCase() === normReg)
        );

        if (duplicate) {
          return { alreadySubmitted: true };
        }
      }
    } catch (e) {}
  }

  // Local storage check
  try {
    const cached = localStorage.getItem(LOCAL_EVENT_FEEDBACKS_KEY);
    if (cached) {
      const list: EventFeedback[] = JSON.parse(cached);
      const duplicate = list.some(
        (f) =>
          f.event_id === eventId &&
          ((f.university_id && f.university_id.trim().toUpperCase() === normUid) ||
            (f.registration_id && f.registration_id.trim().toUpperCase() === normReg))
      );
      if (duplicate) {
        return { alreadySubmitted: true };
      }
    }
  } catch (e) {}

  return { alreadySubmitted: false };
};
