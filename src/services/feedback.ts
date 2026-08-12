import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { ContactFeedback } from '../types/database';

export interface SubmitFeedbackPayload {
  name: string;
  email: string;
  message: string;
}

export const submitFeedback = async (
  payload: SubmitFeedbackPayload
): Promise<ContactFeedback> => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase is not configured yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to persist feedback.');
    // Demo fallback for local development without credentials
    return {
      id: 'demo-' + Date.now(),
      name: payload.name,
      email: payload.email,
      message: payload.message,
      status: 'unread',
      created_at: new Date().toISOString(),
    };
  }

  const { data, error } = await supabase
    .from('contact_feedbacks')
    .insert({
      name: payload.name.trim(),
      email: payload.email.trim(),
      message: payload.message.trim(),
      status: 'unread',
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error submitting user feedback to Supabase:', error.message);
    throw new Error(`Failed to submit feedback: ${error.message}`);
  }

  return data as ContactFeedback;
};
