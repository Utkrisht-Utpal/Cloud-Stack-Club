import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { ContactFeedback } from '../types/database';

export interface SubmitFeedbackPayload {
  name: string;
  email: string;
  message: string;
}

const LOCAL_FEEDBACKS_KEY = 'csc_contact_feedbacks';

export const submitFeedback = async (
  payload: SubmitFeedbackPayload
): Promise<ContactFeedback> => {
  const newFeedback: ContactFeedback = {
    id: 'fb-' + Date.now(),
    name: payload.name.trim(),
    email: payload.email.trim(),
    message: payload.message.trim(),
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  // Instant local storage cache
  try {
    const existing = localStorage.getItem(LOCAL_FEEDBACKS_KEY);
    const list: ContactFeedback[] = existing ? JSON.parse(existing) : [];
    list.unshift(newFeedback);
    localStorage.setItem(LOCAL_FEEDBACKS_KEY, JSON.stringify(list));
  } catch (e) {}

  if (!isSupabaseConfigured()) {
    return newFeedback;
  }

  try {
    const { data, error } = await supabase
      .from('contact_feedbacks')
      .insert({
        name: payload.name.trim(),
        email: payload.email.trim(),
        message: payload.message.trim(),
        status: 'pending',
      })
      .select('*')
      .maybeSingle();

    if (!error && data) {
      return data as ContactFeedback;
    }
  } catch (e) {}

  return newFeedback;
};

export const getAllFeedbacks = async (): Promise<ContactFeedback[]> => {
  let list: ContactFeedback[] = [];

  // Local storage cache
  try {
    const cached = localStorage.getItem(LOCAL_FEEDBACKS_KEY);
    if (cached) {
      list = JSON.parse(cached);
    }
  } catch (e) {}

  if (!isSupabaseConfigured()) {
    return list;
  }

  try {
    const { data, error } = await supabase
      .from('contact_feedbacks')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Merge remote & local
      const map = new Map<string, ContactFeedback>();
      data.forEach((f) => map.set(f.id, f as ContactFeedback));
      list.forEach((f) => {
        if (!map.has(f.id)) map.set(f.id, f);
      });
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    }
  } catch (e) {}

  return list;
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
