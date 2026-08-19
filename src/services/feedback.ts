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
    const { data, error } = await supabase
      .from('contact_feedbacks')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const rawDbList = (data as any[]) || [];
      // Strict filter: contact feedbacks must not be event-specific
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

      const seenIds = new Set<string>();
      const seenSignatures = new Set<string>();
      const combined: ContactFeedback[] = [];

      dbList.forEach((f) => {
        const sig = `${(f.name || '').toLowerCase().trim()}|${(f.email || '').toLowerCase().trim()}|${(f.message || '').toLowerCase().trim()}`;
        if (!seenIds.has(f.id) && !seenSignatures.has(sig)) {
          seenIds.add(f.id);
          seenSignatures.add(sig);
          combined.push(f);
        }
      });

      localList.forEach((f) => {
        const sig = `${(f.name || '').toLowerCase().trim()}|${(f.email || '').toLowerCase().trim()}|${(f.message || '').toLowerCase().trim()}`;
        if (!seenIds.has(f.id) && !seenSignatures.has(sig)) {
          seenIds.add(f.id);
          seenSignatures.add(sig);
          combined.push(f);
        }
      });

      try {
        localStorage.setItem(LOCAL_CONTACT_FEEDBACKS_KEY, JSON.stringify(combined));
      } catch (e) {}

      return combined.sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    }
  } catch (e) {}

  return localList;
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
  university_id: string;
  registration_id: string;
  event_id: string;
  event_title: string;
  event_rating: number;
  engagement_rating: number;
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
    const insertObj = {
      name: payload.name.trim(),
      email: payload.email.trim(),
      university_id: payload.university_id.trim(),
      registration_id: payload.registration_id.trim(),
      event_id: payload.event_id.trim(),
      event_title: payload.event_title.trim(),
      event_rating: payload.event_rating,
      engagement_rating: payload.engagement_rating,
      coordination_rating: payload.coordination_rating.trim(),
      message: payload.message.trim(),
      status: 'pending' as FeedbackStatus,
    };

    const { data, error } = await supabase
      .from('event_feedbacks')
      .insert(insertObj)
      .select('*')
      .maybeSingle();

    if (!error && data) {
      const dbEventFeedback = data as EventFeedback;
      try {
        const existing = localStorage.getItem(LOCAL_EVENT_FEEDBACKS_KEY);
        let list: EventFeedback[] = existing ? JSON.parse(existing) : [];
        list = list.filter((f) => f.id !== tempId && f.id !== dbEventFeedback.id);
        list.unshift(dbEventFeedback);
        localStorage.setItem(LOCAL_EVENT_FEEDBACKS_KEY, JSON.stringify(list));
      } catch (e) {}
      return dbEventFeedback;
    }
  } catch (e) {}

  // Fallback to local storage
  try {
    const existing = localStorage.getItem(LOCAL_EVENT_FEEDBACKS_KEY);
    const list: EventFeedback[] = existing ? JSON.parse(existing) : [];
    list.unshift(newEventFeedback);
    localStorage.setItem(LOCAL_EVENT_FEEDBACKS_KEY, JSON.stringify(list));
  } catch (e) {}

  return newEventFeedback;
};

export const getAllEventFeedbacks = async (): Promise<EventFeedback[]> => {
  let localList: EventFeedback[] = [];

  try {
    const cached = localStorage.getItem(LOCAL_EVENT_FEEDBACKS_KEY);
    if (cached) {
      localList = JSON.parse(cached);
    }

    // Recover any event feedback items previously cached in contact feedback storage
    const oldContactCache = localStorage.getItem(LOCAL_CONTACT_FEEDBACKS_KEY);
    if (oldContactCache) {
      const parsed = JSON.parse(oldContactCache);
      if (Array.isArray(parsed)) {
        parsed.forEach((item: any) => {
          if (item.event_id || item.event_title || item.feedback_type === 'event') {
            if (!localList.some((e) => e.id === item.id)) {
              localList.push({
                id: item.id,
                name: item.name || '',
                email: item.email || '',
                university_id: item.university_id || '',
                registration_id: item.registration_id || '',
                event_id: item.event_id || '',
                event_title: item.event_title || 'Event',
                event_rating: item.event_rating || 5,
                engagement_rating: item.engagement_rating || 5,
                coordination_rating: item.coordination_rating || '10 / 10',
                message: item.message || '',
                status: item.status || 'pending',
                created_at: item.created_at || new Date().toISOString(),
              });
            }
          }
        });
      }
    }
  } catch (e) {}

  if (!isSupabaseConfigured()) {
    return localList;
  }

  try {
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

      if (!simpleError && simpleData) {
        dbList = simpleData as EventFeedback[];
      }
    }

    if (dbList.length > 0 || !error) {
      const seenIds = new Set<string>();
      const combined: EventFeedback[] = [];

      dbList.forEach((f) => {
        if (!seenIds.has(f.id)) {
          seenIds.add(f.id);
          combined.push(f);
        }
      });

      localList.forEach((f) => {
        if (!seenIds.has(f.id)) {
          seenIds.add(f.id);
          combined.push(f);
        }
      });

      try {
        localStorage.setItem(LOCAL_EVENT_FEEDBACKS_KEY, JSON.stringify(combined));
      } catch (e) {}

      return combined.sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    }
  } catch (e) {}

  return localList;
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
