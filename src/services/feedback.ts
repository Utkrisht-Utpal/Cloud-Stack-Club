import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { ContactFeedback, EventFeedback, FeedbackStatus } from '../types/database';

/* =========================================================================
   1. CONTACT FORM FEEDBACK SERVICES (Table: contact_feedbacks)
   ========================================================================= */

export interface SubmitFeedbackPayload {
  name: string;
  email: string;
  message: string;
  turnstileToken?: string;
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

  const workerUrl = import.meta.env.VITE_MEDIA_WORKER_URL || '';
  if (!workerUrl) {
    throw new Error('Public API Gateway is not configured. Please check VITE_MEDIA_WORKER_URL.');
  }

  const response = await fetch(`${workerUrl}/api/submit-contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(payload.turnstileToken ? { 'cf-turnstile-response': payload.turnstileToken } : {}),
    },
    body: JSON.stringify({
      name: payload.name.trim(),
      email: payload.email.trim(),
      message: payload.message.trim(),
      turnstile_token: payload.turnstileToken,
    }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({ error: 'Feedback submission failed' }));
    throw new Error((errorJson as any).error || `Feedback submission failed with status ${response.status}`);
  }

  const parsed = await response.json();
  const dbFeedback: ContactFeedback = {
    ...newFeedback,
    id: parsed.id || tempId,
  };

  try {
    const existing = localStorage.getItem(LOCAL_CONTACT_FEEDBACKS_KEY);
    let list: ContactFeedback[] = existing ? JSON.parse(existing) : [];
    list = list.filter((f) => f.id !== tempId && f.id !== dbFeedback.id);
    list.unshift(dbFeedback);
    localStorage.setItem(LOCAL_CONTACT_FEEDBACKS_KEY, JSON.stringify(list));
  } catch (e) {}

  return dbFeedback;
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
  turnstileToken?: string;
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
    // 1. Resolve UUID event_id if title or slug passed
    let targetEventId = payload.event_id.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetEventId);

    if (!isUuid) {
      const { data: dbEvt } = await supabase
        .from('events')
        .select('id')
        .or(`slug.eq.${targetEventId},id.eq.${targetEventId}`)
        .maybeSingle();

      if (dbEvt?.id) targetEventId = dbEvt.id;
    }

    // 2. Submit via Worker Zero-Trust Gateway
    const workerUrl = import.meta.env.VITE_MEDIA_WORKER_URL || '';
    if (!workerUrl) {
      throw new Error('Public API Gateway is not configured. Please check VITE_MEDIA_WORKER_URL.');
    }

    const response = await fetch(`${workerUrl}/api/submit-feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(payload.turnstileToken ? { 'cf-turnstile-response': payload.turnstileToken } : {}),
      },
      body: JSON.stringify({
        event_id: targetEventId,
        event_title: payload.event_title.trim(),
        name: payload.name.trim(),
        email: payload.email.trim(),
        phone: payload.phone?.trim() || null,
        university_id: payload.university_id.trim(),
        registration_id: payload.registration_id.trim(),
        event_rating: payload.event_rating,
        engagement_rating: payload.engagement_rating ?? 5,
        coordination_rating: payload.coordination_rating.trim(),
        message: payload.message.trim(),
        turnstile_token: payload.turnstileToken,
      }),
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({ error: 'Event feedback submission failed' }));
      throw new Error((errorJson as any).error || `Feedback submission failed with status ${response.status}`);
    }

    const parsed = await response.json();
    const savedFeedback: EventFeedback = {
      ...newEventFeedback,
      id: parsed.id || tempId,
    };

    try {
      const existing = localStorage.getItem(LOCAL_EVENT_FEEDBACKS_KEY);
      const list: EventFeedback[] = existing ? JSON.parse(existing) : [];
      list.unshift(savedFeedback);
      localStorage.setItem(LOCAL_EVENT_FEEDBACKS_KEY, JSON.stringify(list));
    } catch (e) {}

    return savedFeedback;
  } catch (err: any) {
    console.error('Error in submitEventFeedback:', err);
    throw err;
  }
};

export const fetchFreshEventFeedbacksFromDb = async (): Promise<EventFeedback[]> => {
  if (!isSupabaseConfigured()) {
    const cached = localStorage.getItem(LOCAL_EVENT_FEEDBACKS_KEY);
    return cached ? JSON.parse(cached) : [];
  }

  let dbList: EventFeedback[] = [];

  const { data, error } = await supabase
    .from('event_feedbacks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching event feedbacks from database:', error.message);
    const cached = localStorage.getItem(LOCAL_EVENT_FEEDBACKS_KEY);
    return cached ? JSON.parse(cached) : [];
  }

  if (data) {
    dbList = (data as any[]).map((f) => ({
      id: f.id,
      name: f.name,
      email: f.email,
      phone: f.phone,
      university_id: f.university_id,
      registration_id: f.registration_id,
      event_id: f.event_id,
      event_title: f.event_title || 'Event',
      event_rating: f.event_rating,
      engagement_rating: f.engagement_rating,
      coordination_rating: f.coordination_rating,
      message: f.message,
      status: f.status || 'pending',
      created_at: f.created_at,
    }));
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
 * Validates that the entered Registration ID, University ID (UID), Email, and Phone Number
 * are strictly bound and belong to the same attendee for the specified event (individual or team member).
 */
export const verifyEventRegistration = async (
  eventId: string,
  universityId: string,
  registrationId: string,
  email?: string,
  phone?: string
): Promise<VerifyEventRegistrationResult> => {
  const normUid = (universityId || '').trim().toUpperCase();
  const normReg = (registrationId || '').trim().toUpperCase();
  const normEmail = (email || '').trim().toLowerCase();
  const normPhone = (phone || '').trim().replace(/\D/g, '');

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

  // 2. Query Supabase database securely
  if (isSupabaseConfigured()) {
    try {
      // 2.1 Attempt Server-Side RPC
      const { data: rpcResult, error: rpcErr } = await supabase.rpc('verify_event_registration', {
        p_event_id: targetEventId,
        p_uid: normUid,
        p_registration_number: normReg,
        p_email: normEmail || null,
        p_phone: normPhone || null,
      });

      if (!rpcErr && rpcResult) {
        const res = typeof rpcResult === 'string' ? JSON.parse(rpcResult) : rpcResult;
        if (res.is_valid) {
          return {
            isValid: true,
            registrantName: res.registrant_name,
            registrantEmail: res.registrant_email,
            registrantPhone: res.registrant_phone || undefined,
            isTeamMember: res.is_team_member || false,
            teamName: res.team_name,
          };
        }
      }

      // 2.2 Targeted Single-Row Fallback (Primary registrant / Team leader)
      let primaryQuery = supabase
        .from('event_registrations')
        .select('registrant_name, registrant_email, registrant_phone')
        .eq('event_id', targetEventId)
        .ilike('uid', normUid)
        .ilike('registration_number', normReg);

      if (normEmail) {
        primaryQuery = primaryQuery.ilike('registrant_email', normEmail);
      }
      if (normPhone) {
        primaryQuery = primaryQuery.ilike('registrant_phone', `%${normPhone}%`);
      }

      const { data: primaryMatch } = await primaryQuery.maybeSingle();

      if (primaryMatch) {
        return {
          isValid: true,
          registrantName: primaryMatch.registrant_name,
          registrantEmail: primaryMatch.registrant_email,
          registrantPhone: primaryMatch.registrant_phone || undefined,
          isTeamMember: false,
        };
      }

      // 2.3 Check team members targeted
      let teamQuery = supabase
        .from('event_team_members')
        .select('name, email, phone, team_id, registration_number')
        .ilike('uid', normUid)
        .ilike('registration_number', normReg);

      if (normEmail) {
        teamQuery = teamQuery.ilike('email', normEmail);
      }
      if (normPhone) {
        teamQuery = teamQuery.ilike('phone', `%${normPhone}%`);
      }

      const { data: teamMemberMatch } = await teamQuery.maybeSingle();

      if (teamMemberMatch) {
        return {
          isValid: true,
          registrantName: teamMemberMatch.name,
          registrantEmail: teamMemberMatch.email,
          registrantPhone: teamMemberMatch.phone || undefined,
          isTeamMember: true,
        };
      }

      // If no valid match was found, return strict rejection message
      return {
        isValid: false,
        error: `Registration ID, UID, Email, and Phone do not match our event registration records. Please verify your details.`,
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
              (r.uid || '').trim().toUpperCase() === normUid &&
              (!normEmail || (r.registrant_email || '').trim().toLowerCase() === normEmail)
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
 * Checks whether feedback has already been submitted for this event by UID, Registration ID, Email, or Phone.
 */
export const checkExistingFeedbackForEvent = async (
  eventId: string,
  universityId: string,
  registrationId?: string,
  email?: string,
  phone?: string
): Promise<{ alreadySubmitted: boolean }> => {
  const normUid = (universityId || '').trim().toUpperCase();
  const normReg = (registrationId || '').trim().toUpperCase();
  const normEmail = (email || '').trim().toLowerCase();
  const normPhone = (phone || '').trim().replace(/\D/g, '');

  if (!normUid && !normReg && !normEmail && !normPhone) return { alreadySubmitted: false };

  if (isSupabaseConfigured()) {
    try {
      const { data: existingFeedbacks, error } = await supabase
        .from('event_feedbacks')
        .select('id, university_id, registration_id, email, phone')
        .eq('event_id', eventId);

      if (!error && existingFeedbacks && existingFeedbacks.length > 0) {
        const duplicate = existingFeedbacks.some(
          (f) =>
            (normUid && f.university_id && f.university_id.trim().toUpperCase() === normUid) ||
            (normReg && f.registration_id && f.registration_id.trim().toUpperCase() === normReg) ||
            (normEmail && f.email && f.email.trim().toLowerCase() === normEmail) ||
            (normPhone && f.phone && f.phone.replace(/\D/g, '') === normPhone)
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
          ((normUid && f.university_id && f.university_id.trim().toUpperCase() === normUid) ||
            (normReg && f.registration_id && f.registration_id.trim().toUpperCase() === normReg) ||
            (normEmail && f.email && f.email.trim().toLowerCase() === normEmail) ||
            (normPhone && f.phone && f.phone.replace(/\D/g, '') === normPhone))
      );
      if (duplicate) {
        return { alreadySubmitted: true };
      }
    }
  } catch (e) {}

  return { alreadySubmitted: false };
};
