import emailjs from '@emailjs/browser';
import { emailConfig } from '../constants/emailConfig';

// Initialize EmailJS once
emailjs.init(emailConfig.PUBLIC_KEY);

const toEmails = emailConfig.RECIPIENT_EMAILS.join(', ');

/** Returns separate date and time strings in IST */
const getDateTime = () => {
  const now = new Date();
  const date = now.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const time = now.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  return { date, time };
};

/**
 * Send Join Club application to all configured recipient emails.
 * Template variables: {{from_name}}, {{from_email}}, {{uid}}, {{domain}}, {{date}}, {{time}}
 */
export async function sendJoinApplication(data: {
  name: string;
  email: string;
  uid: string;
  domain: string;
}) {
  const { date, time } = getDateTime();
  return emailjs.send(
    emailConfig.SERVICE_ID,
    emailConfig.JOIN_TEMPLATE_ID,
    {
      to_emails: toEmails,
      from_name: data.name,
      from_email: data.email,
      uid: data.uid,
      domain: data.domain,
      date,
      time,
    }
  );
}

/**
 * Send Contact Us message to all configured recipient emails.
 * Template variables: {{from_name}}, {{from_email}}, {{message}}, {{date}}, {{time}}
 */
export async function sendContactMessage(data: {
  name: string;
  email: string;
  message: string;
}) {
  const { date, time } = getDateTime();
  return emailjs.send(
    emailConfig.SERVICE_ID,
    emailConfig.CONTACT_TEMPLATE_ID,
    {
      to_emails: toEmails,
      from_name: data.name,
      from_email: data.email,
      message: data.message,
      date,
      time,
    }
  );
}
