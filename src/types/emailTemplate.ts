import type { EmailCategory } from './email';

export type BannerStyle = 'modern_badge' | 'official_strip' | 'minimal' | 'classic';
export type BannerTextColor = 'white' | 'dark';
export type BannerTheme =
  | 'classic_blue'
  | 'emerald_tech'
  | 'cosmic_purple'
  | 'ruby_crimson'
  | 'midnight_slate'
  | 'sunset_amber'
  | 'cyberpunk_neon'
  | 'oceanic_teal'
  | 'gold_luxury'
  | 'aurora_green'
  | 'solar_flare'
  | 'obsidian_mono';

export interface EmailTemplateConfig {
  id?: string;
  category: EmailCategory;
  name: string;
  description: string;
  subject: string;
  banner_style?: BannerStyle;
  banner_theme?: BannerTheme;
  banner_text_color?: BannerTextColor;
  banner_title?: string;
  banner_subtitle?: string;
  headline: string;
  body_text: string;
  button_text?: string;
  button_url?: string;
  footer_text?: string;
  is_active?: boolean;
  updated_at?: string;
  updated_by?: string;
}

export const BANNER_THEME_GRADIENTS: Record<
  BannerTheme,
  {
    name: string;
    gradient: string;
    previewBg: string;
    textAccent: string;
    borderAccent: string;
    buttonGradient: string;
    buttonTextColor: string;
    buttonShadow: string;
  }
> = {
  classic_blue: {
    name: 'CSC Royal Blue',
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #0284c7 100%)',
    previewBg: 'from-blue-900 via-blue-600 to-sky-600',
    textAccent: '#93c5fd',
    borderAccent: '#38bdf8',
    buttonGradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    buttonTextColor: '#ffffff',
    buttonShadow: 'rgba(37, 99, 235, 0.4)',
  },
  emerald_tech: {
    name: 'Emerald Tech',
    gradient: 'linear-gradient(135deg, #064e3b 0%, #059669 50%, #0d9488 100%)',
    previewBg: 'from-emerald-950 via-emerald-600 to-teal-600',
    textAccent: '#a7f3d0',
    borderAccent: '#34d399',
    buttonGradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    buttonTextColor: '#ffffff',
    buttonShadow: 'rgba(5, 150, 105, 0.4)',
  },
  cosmic_purple: {
    name: 'Cosmic Purple',
    gradient: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #7c3aed 100%)',
    previewBg: 'from-indigo-950 via-indigo-600 to-purple-600',
    textAccent: '#c4b5fd',
    borderAccent: '#a78bfa',
    buttonGradient: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    buttonTextColor: '#ffffff',
    buttonShadow: 'rgba(124, 58, 237, 0.4)',
  },
  ruby_crimson: {
    name: 'Ruby Crimson',
    gradient: 'linear-gradient(135deg, #4c0519 0%, #be123c 50%, #f43f5e 100%)',
    previewBg: 'from-rose-950 via-rose-600 to-pink-600',
    textAccent: '#fecdd3',
    borderAccent: '#fb7185',
    buttonGradient: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
    buttonTextColor: '#ffffff',
    buttonShadow: 'rgba(225, 29, 72, 0.4)',
  },
  midnight_slate: {
    name: 'Midnight Slate',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
    previewBg: 'from-slate-900 via-slate-800 to-slate-700',
    textAccent: '#94a3b8',
    borderAccent: '#64748b',
    buttonGradient: 'linear-gradient(135deg, #334155 0%, #1e293b 100%)',
    buttonTextColor: '#ffffff',
    buttonShadow: 'rgba(51, 65, 85, 0.4)',
  },
  sunset_amber: {
    name: 'Sunset Amber',
    gradient: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 50%, #f59e0b 100%)',
    previewBg: 'from-amber-950 via-orange-600 to-amber-500',
    textAccent: '#fde68a',
    borderAccent: '#f59e0b',
    buttonGradient: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
    buttonTextColor: '#ffffff',
    buttonShadow: 'rgba(234, 88, 12, 0.4)',
  },
  cyberpunk_neon: {
    name: 'Cyberpunk Neon',
    gradient: 'linear-gradient(135deg, #3b0764 0%, #9333ea 50%, #06b6d4 100%)',
    previewBg: 'from-purple-950 via-purple-600 to-cyan-500',
    textAccent: '#67e8f9',
    borderAccent: '#a855f7',
    buttonGradient: 'linear-gradient(135deg, #9333ea 0%, #06b6d4 100%)',
    buttonTextColor: '#ffffff',
    buttonShadow: 'rgba(147, 51, 234, 0.4)',
  },
  oceanic_teal: {
    name: 'Oceanic Teal',
    gradient: 'linear-gradient(135deg, #083344 0%, #0891b2 50%, #06b6d4 100%)',
    previewBg: 'from-cyan-950 via-cyan-700 to-teal-500',
    textAccent: '#a5f3fc',
    borderAccent: '#22d3ee',
    buttonGradient: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
    buttonTextColor: '#ffffff',
    buttonShadow: 'rgba(8, 145, 178, 0.4)',
  },
  gold_luxury: {
    name: 'Gold Luxury',
    gradient: 'linear-gradient(135deg, #451a03 0%, #b45309 50%, #d97706 100%)',
    previewBg: 'from-amber-950 via-yellow-700 to-amber-500',
    textAccent: '#fef08a',
    borderAccent: '#eab308',
    buttonGradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    buttonTextColor: '#ffffff',
    buttonShadow: 'rgba(217, 119, 6, 0.4)',
  },
  aurora_green: {
    name: 'Aurora Borealis',
    gradient: 'linear-gradient(135deg, #022c22 0%, #0d9488 50%, #84cc16 100%)',
    previewBg: 'from-emerald-950 via-teal-700 to-lime-500',
    textAccent: '#bef264',
    borderAccent: '#10b981',
    buttonGradient: 'linear-gradient(135deg, #0d9488 0%, #047857 100%)',
    buttonTextColor: '#ffffff',
    buttonShadow: 'rgba(13, 148, 136, 0.4)',
  },
  solar_flare: {
    name: 'Solar Flare',
    gradient: 'linear-gradient(135deg, #581c87 0%, #c026d3 50%, #f43f5e 100%)',
    previewBg: 'from-fuchsia-950 via-fuchsia-600 to-rose-500',
    textAccent: '#fbcfe8',
    borderAccent: '#f43f5e',
    buttonGradient: 'linear-gradient(135deg, #c026d3 0%, #db2777 100%)',
    buttonTextColor: '#ffffff',
    buttonShadow: 'rgba(192, 38, 211, 0.4)',
  },
  obsidian_mono: {
    name: 'Obsidian Monolith',
    gradient: 'linear-gradient(135deg, #000000 0%, #18181b 50%, #27272a 100%)',
    previewBg: 'from-black via-zinc-800 to-zinc-700',
    textAccent: '#e4e4e7',
    borderAccent: '#52525b',
    buttonGradient: 'linear-gradient(135deg, #27272a 0%, #09090b 100%)',
    buttonTextColor: '#ffffff',
    buttonShadow: 'rgba(0, 0, 0, 0.5)',
  },
};

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
    banner_style: 'modern_badge',
    banner_theme: 'classic_blue',
    banner_title: 'Cloud Stack Club',
    banner_subtitle: 'Chandigarh University',
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
    banner_style: 'modern_badge',
    banner_theme: 'classic_blue',
    banner_title: 'Cloud Stack Club',
    banner_subtitle: 'Chandigarh University',
    headline: 'Application Status Update',
    body_text: `Dear {{name}},

Thank you for taking the time to apply to Cloud Stack Club. We carefully reviewed your submission along with hundreds of student applications received for this session.

After thorough consideration, we regret to inform you that we are unable to approve your application at this time.

We encourage you to continue participating in our public tech events and reapply during the next recruitment window!`,
    button_text: 'Explore Public Events',
    button_url: 'https://cloudstackclub.vercel.app/events',
    footer_text: 'This is an official communication from Cloud Stack Club, Chandigarh University. Please do not reply directly to this automated email.',
    is_active: true,
  },
  contact_us: {
    category: 'contact_us',
    name: 'Contact Inquiry Update',
    description: 'Sent when a coordinator updates or responds to a contact inquiry.',
    subject: 'Update Regarding Your Inquiry: {{subject_topic}}',
    banner_style: 'modern_badge',
    banner_theme: 'classic_blue',
    banner_title: 'Cloud Stack Club',
    banner_subtitle: 'Chandigarh University',
    headline: 'Inquiry Status Update',
    body_text: `Dear {{name}},

We have reviewed your inquiry regarding "{{subject_topic}}" and updated its status to {{new_status}}.

If you have further questions or need additional assistance, feel free to reach out to us again through the portal.`,
    button_text: 'Contact Us / Support',
    button_url: 'https://cloudstackclub.vercel.app/contact-us',
    footer_text: 'This is an official communication from Cloud Stack Club, Chandigarh University. Please do not reply directly to this automated email.',
    is_active: true,
  },
  event_feedback: {
    category: 'event_feedback',
    name: 'Event Feedback Response',
    description: 'Sent to attendees when coordinator reviews their event feedback.',
    subject: 'Thank you for your feedback on: {{event_title}}',
    banner_style: 'modern_badge',
    banner_theme: 'classic_blue',
    banner_title: 'Cloud Stack Club',
    banner_subtitle: 'Chandigarh University',
    headline: 'Thank You for Your Feedback!',
    body_text: `Dear {{name}},

We have reviewed your feedback for {{event_title}}. Your thoughts help us continually improve and bring more valuable experiences to the campus community.

We look forward to seeing you at our upcoming sessions!`,
    button_text: 'View More Events',
    button_url: 'https://cloudstackclub.vercel.app/events',
    footer_text: 'This is an official communication from Cloud Stack Club, Chandigarh University. Please do not reply directly to this automated email.',
    is_active: true,
  },
  event_broadcast: {
    category: 'event_broadcast',
    name: 'Event Announcement Broadcast',
    description: 'Sent to all active members when broadcasting an upcoming event.',
    subject: '🚀 New Event Announcement: {{event_title}}',
    banner_style: 'modern_badge',
    banner_theme: 'classic_blue',
    banner_title: 'Cloud Stack Club',
    banner_subtitle: 'Chandigarh University',
    headline: '{{event_title}}',
    body_text: `We are excited to announce a new technical event organized by Cloud Stack Club!

Join us for an immersive session designed to enhance your practical cloud skills, network with peers, and learn directly from industry mentors. Check out the event logistics below and reserve your seat early!`,
    button_text: 'Register Now',
    button_url: 'https://cloudstackclub.vercel.app/events',
    footer_text: 'This is an official communication from Cloud Stack Club, Chandigarh University. Please do not reply directly to this automated email.',
    is_active: true,
  },
};
