import { submitFeedback } from './feedback';
import { registerForEvent } from './registrations';

/**
 * Legacy wrapper redirected to Supabase Backend
 */
export async function sendJoinApplication(data: {
  name: string;
  email: string;
  uid: string;
  phone?: string;
  department?: string;
  year?: string;
}) {
  return registerForEvent({
    event_id: 'membership-application',
    registrant_name: data.name,
    registrant_email: data.email,
    registrant_phone: data.phone,
    uid: data.uid,
    is_member: false,
  });
}

export async function sendContactMessage(data: {
  name: string;
  email: string;
  message: string;
}) {
  return submitFeedback(data);
}
