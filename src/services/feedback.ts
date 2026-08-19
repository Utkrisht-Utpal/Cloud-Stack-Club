import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { ContactFeedback } from '../types/database';

export interface SubmitFeedbackPayload {
  name: string;
  email: string;
  university_id?: string;
  message: string;
}

const LOCAL_FEEDBACKS_KEY = 'csc_contact_feedbacks';

export const submitFeedback = async (
  payload: SubmitFeedbackPayload
): Promise<ContactFeedback> => {
  const tempId = 'fb-' + Date.now();
  const newFeedback: ContactFeedback = {
    id: tempId,
    name: payload.name.trim(),
    email: payload.email.trim(),
    university_id: payload.university_id ? payload.university_id.trim() : undefined,
    message: payload.message.trim(),
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) {
    try {
      const existing = localStorage.getItem(LOCAL_FEEDBACKS_KEY);
      const list: ContactFeedback[] = existing ? JSON.parse(existing) : [];
      list.unshift(newFeedback);
      localStorage.setItem(LOCAL_FEEDBACKS_KEY, JSON.stringify(list));
    } catch (e) {}
    return newFeedback;
  }

  try {
    const insertObj: any = {
      name: payload.name.trim(),
      email: payload.email.trim(),
      message: payload.message.trim(),
      status: 'pending',
    };
    if (payload.university_id && payload.university_id.trim()) {
      insertObj.university_id = payload.university_id.trim();
    }

    const { data, error } = await supabase
      .from('contact_feedbacks')
      .insert(insertObj)
      .select('*')
      .maybeSingle();

    if (!error && data) {
      const dbFeedback = data as ContactFeedback;
      // Update local storage with canonical DB object
      try {
        const existing = localStorage.getItem(LOCAL_FEEDBACKS_KEY);
        let list: ContactFeedback[] = existing ? JSON.parse(existing) : [];
        list = list.filter((f) => f.id !== tempId && f.id !== dbFeedback.id);
        list.unshift(dbFeedback);
        localStorage.setItem(LOCAL_FEEDBACKS_KEY, JSON.stringify(list));
      } catch (e) {}

      return dbFeedback;
    }

    // Graceful fallback: If Supabase table doesn't have university_id column yet, retry insert without it
    if (error && insertObj.university_id) {
      delete insertObj.university_id;
      const retry = await supabase
        .from('contact_feedbacks')
        .insert(insertObj)
        .select('*')
        .maybeSingle();

      if (!retry.error && retry.data) {
        const fallbackFeedback = { ...(retry.data as ContactFeedback), university_id: payload.university_id?.trim() };
        try {
          const existing = localStorage.getItem(LOCAL_FEEDBACKS_KEY);
          let list: ContactFeedback[] = existing ? JSON.parse(existing) : [];
          list = list.filter((f) => f.id !== tempId && f.id !== fallbackFeedback.id);
          list.unshift(fallbackFeedback);
          localStorage.setItem(LOCAL_FEEDBACKS_KEY, JSON.stringify(list));
        } catch (e) {}
        return fallbackFeedback;
      }
    }
  } catch (e) {}

  return newFeedback;
};

export const getAllFeedbacks = async (): Promise<ContactFeedback[]> => {
  let localList: ContactFeedback[] = [];

  try {
    const cached = localStorage.getItem(LOCAL_FEEDBACKS_KEY);
    if (cached) {
      localList = JSON.parse(cached);
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
      const dbList = (data as ContactFeedback[]) || [];

      // Deduplicate by signature (name + email + message) & ID
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

      // Update local storage with clean deduplicated list
      try {
        localStorage.setItem(LOCAL_FEEDBACKS_KEY, JSON.stringify(combined));
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
  status: 'pending' | 'in_progress' | 'resolved' | 'archived' | 'read' | 'unread' | 'responded'
): Promise<boolean> => {
  // Update local storage
  try {
    const cached = localStorage.getItem(LOCAL_FEEDBACKS_KEY);
    if (cached) {
      const list: ContactFeedback[] = JSON.parse(cached);
      const updated = list.map((f) => (f.id === id ? { ...f, status } : f));
      localStorage.setItem(LOCAL_FEEDBACKS_KEY, JSON.stringify(updated));
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
