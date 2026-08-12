import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { EventRegistrationForm, EventFormField } from '../types/database';

export const getFormForEvent = async (eventId: string): Promise<EventRegistrationForm | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data: formData, error: formError } = await supabase
    .from('event_registration_forms')
    .select('*')
    .eq('event_id', eventId)
    .eq('is_active', true)
    .maybeSingle();

  if (formError || !formData) {
    if (formError) {
      console.error(`Error fetching form for event ${eventId}:`, formError.message);
    }
    return null;
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

  return {
    ...(formData as EventRegistrationForm),
    fields: (fieldsData as EventFormField[]) || [],
  };
};
