import type { EmailCategory } from './email';

export interface EmailTemplateConfig {
  id?: string;
  category: EmailCategory;
  name: string;
  description: string;
  subject: string;
  headline: string;
  body_text: string;
  button_text?: string;
  button_url?: string;
  footer_text?: string;
  is_active?: boolean;
  updated_at?: string;
  updated_by?: string;
}

export interface TemplateVariable {
  key: string;
  label: string;
  sampleValue: string;
  description: string;
}

export const CATEGORY_VARIABLES: Record<EmailCategory, TemplateVariable[]> = {
  approval: [
    { key: '{{name}}', label: 'Member Name', sampleValue: 'Aarav Sharma', description: 'Full name of approved student' },
    { key: '{{registration_id}}', label: 'Registration ID', sampleValue: 'CSC-26-4892', description: 'Unique club registration number' },
    { key: '{{department}}', label: 'Department / Branch', sampleValue: 'Computer Science & Engineering', description: 'Academic department' },
    { key: '{{email}}', label: 'Member Email', sampleValue: 'aarav.sharma@cumail.in', description: 'Email address of member' },
    { key: '{{portal_url}}', label: 'Portal Link', sampleValue: 'https://cloudstackclub.vercel.app', description: 'URL to club website' },
  ],
  rejection: [
    { key: '{{name}}', label: 'Applicant Name', sampleValue: 'Rohan Gupta', description: 'Name of the applicant' },
    { key: '{{rejection_reason}}', label: 'Reviewer Feedback', sampleValue: 'We reached capacity for the requested technical domain. Please build more project experience and reapply next cycle.', description: 'Feedback provided by reviewers' },
    { key: '{{email}}', label: 'Applicant Email', sampleValue: 'rohan.gupta@cumail.in', description: 'Email address of applicant' },
    { key: '{{portal_url}}', label: 'Portal Link', sampleValue: 'https://cloudstackclub.vercel.app', description: 'URL to club website' },
  ],
  contact_us: [
    { key: '{{name}}', label: 'Sender Name', sampleValue: 'Priya Verma', description: 'Name of the person who reached out' },
    { key: '{{subject_topic}}', label: 'Inquiry Topic', sampleValue: 'Collaboration on Upcoming Hackathon', description: 'Subject of original message' },
    { key: '{{new_status}}', label: 'Ticket Status', sampleValue: 'RESOLVED', description: 'New status (Resolved, In Progress, etc.)' },
    { key: '{{admin_reply}}', label: 'Admin Reply', sampleValue: 'Thank you for reaching out! Our events coordinator will contact you via email this Friday.', description: 'Remarks from coordinator' },
  ],
  event_feedback: [
    { key: '{{name}}', label: 'Attendee Name', sampleValue: 'Ananya Patel', description: 'Student who submitted feedback' },
    { key: '{{event_title}}', label: 'Event Title', sampleValue: 'AWS & Serverless Cloud Workshop 2026', description: 'Name of the event' },
    { key: '{{admin_note}}', label: 'Coordinator Remarks', sampleValue: 'Thank you for your valuable feedback! We have noted your suggestion for more hands-on labs.', description: 'Note from organizer' },
  ],
  event_broadcast: [
    { key: '{{event_title}}', label: 'Event Title', sampleValue: 'DevOps & Kubernetes Cloud Hackathon', description: 'Name of announced event' },
    { key: '{{event_date}}', label: 'Event Date', sampleValue: 'September 15, 2026', description: 'Scheduled date' },
    { key: '{{event_time}}', label: 'Event Time', sampleValue: '10:00 AM - 04:00 PM', description: 'Scheduled time' },
    { key: '{{event_venue}}', label: 'Event Venue', sampleValue: 'Block B, Audi 3, Chandigarh University', description: 'Location / Hall' },
    { key: '{{event_url}}', label: 'Registration URL', sampleValue: 'https://cloudstackclub.vercel.app/events', description: 'Direct event link' },
  ],
};

export const DEFAULT_EMAIL_TEMPLATES: Record<EmailCategory, EmailTemplateConfig> = {
  approval: {
    category: 'approval',
    name: 'Member Application Approved',
    description: 'Sent automatically when an applicant is approved into the club.',
    subject: 'Congratulations! Your Cloud Stack Club Application has been Approved',
    headline: 'Welcome to the Club, {{name}}! 🎉',
    body_text: `We are thrilled to inform you that your membership application for Cloud Stack Club has been officially approved by the core council!

Your profile is now active in our member directory. Stay tuned for upcoming orientation sessions, workshops, and hands-on cloud computing hackathons.`,
    button_text: 'Visit Club Portal',
    button_url: 'https://cloudstackclub.vercel.app',
    footer_text: 'This is an official communication from Cloud Stack Club, Chandigarh University. Please do not reply directly to this automated email.',
    is_active: true,
  },
  rejection: {
    category: 'rejection',
    name: 'Application Status Update',
    description: 'Sent when an application cannot be accepted for the intake cycle.',
    subject: 'Update Regarding Your Cloud Stack Club Membership Application',
    headline: 'Application Status Update',
    body_text: `Dear {{name}},

Thank you for taking the time to apply to Cloud Stack Club. We carefully reviewed your submission along with hundreds of student applications received for this session.

After thorough consideration, we regret to inform you that we are unable to approve your application at this time.

We encourage you to continue participating in our public tech events and reapply during the next recruitment window!`,
    button_text: 'Explore Public Events',
    button_url: 'https://cloudstackclub.vercel.app/events',
    footer_text: 'This is an official communication from Cloud Stack Club, Chandigarh University.',
    is_active: true,
  },
  contact_us: {
    category: 'contact_us',
    name: 'Contact Inquiry Update',
    description: 'Sent when a coordinator updates or responds to a contact inquiry.',
    subject: 'Update Regarding Your Inquiry: {{subject_topic}}',
    headline: 'Inquiry Status Update',
    body_text: `Dear {{name}},

We have reviewed your inquiry regarding "{{subject_topic}}" and updated its status to {{new_status}}.

If you have further questions or need additional assistance, feel free to reach out to us again through the portal.`,
    button_text: 'Contact Us / Support',
    button_url: 'https://cloudstackclub.vercel.app/contact-us',
    footer_text: 'This is an official communication from Cloud Stack Club, Chandigarh University.',
    is_active: true,
  },
  event_feedback: {
    category: 'event_feedback',
    name: 'Event Feedback Response',
    description: 'Sent to attendees when coordinator reviews their event feedback.',
    subject: 'Thank you for your feedback on: {{event_title}}',
    headline: 'Thank You for Your Feedback!',
    body_text: `Dear {{name}},

We have reviewed your feedback for {{event_title}}. Your thoughts help us continually improve and bring more valuable experiences to the campus community.

We look forward to seeing you at our upcoming sessions!`,
    button_text: 'View More Events',
    button_url: 'https://cloudstackclub.vercel.app/events',
    footer_text: 'This is an official communication from Cloud Stack Club, Chandigarh University.',
    is_active: true,
  },
  event_broadcast: {
    category: 'event_broadcast',
    name: 'Event Announcement Broadcast',
    description: 'Sent to all active members when broadcasting an upcoming event.',
    subject: '🚀 New Event Announcement: {{event_title}}',
    headline: '{{event_title}}',
    body_text: `We are excited to announce a new technical event organized by Cloud Stack Club!

Join us for an immersive session designed to enhance your practical cloud skills, network with peers, and learn directly from industry mentors. Check out the event logistics below and reserve your seat early!`,
    button_text: 'Register Now',
    button_url: 'https://cloudstackclub.vercel.app/events',
    footer_text: 'This is an official communication from Cloud Stack Club, Chandigarh University.',
    is_active: true,
  },
};
