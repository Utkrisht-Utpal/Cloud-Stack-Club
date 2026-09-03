import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { EmailLog, SendEmailResult, EmailCategory } from '../types/email';

import { getAllEmailTemplates } from './emailTemplates';

/**
 * Invoke the secure Supabase Edge Function to send an email.
 */
async function invokeSendEmail(action: string, data: Record<string, any>): Promise<SendEmailResult> {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, mock email dispatch for:', action, data);
    return { success: true, sentCount: 1, total: 1 };
  }

  let callerName = data.caller_name;
  if (!callerName) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const meta = authData?.user?.user_metadata || {};
      callerName = meta.full_name || meta.name;
      if (!callerName && authData?.user?.email) {
        const em = authData.user.email.toLowerCase();
        if (em.includes('sushant')) callerName = 'Sushant Kumar';
        else if (em.includes('utkrisht')) callerName = 'Utkrisht Utpal';
        else if (em.includes('laksh') || em.includes('gosai')) callerName = 'Lakshya Gosai';
        else if (em.includes('bani')) callerName = 'Bani Kaur';
        else {
          const prefix = em.split('@')[0].replace(/[0-9]/g, ' ').replace(/[._-]/g, ' ').trim();
          callerName = prefix.replace(/\b\w/g, (c: string) => c.toUpperCase());
        }
      }
    } catch {}
  }

  let customTemplate = data.custom_template;
  if (!customTemplate) {
    try {
      const templates = await getAllEmailTemplates();
      if (templates && templates[action as EmailCategory]) {
        customTemplate = templates[action as EmailCategory];
      }
    } catch {}
  }

  const { data: result, error } = await supabase.functions.invoke('send-email', {
    body: { action, data: { ...data, caller_name: callerName, custom_template: customTemplate } },
  });

  if (error) {
    console.error(`Error invoking send-email Edge Function [${action}]:`, error);
    throw new Error(error.message || 'Failed to dispatch email via Edge Function');
  }

  return result as SendEmailResult;
}

/**
 * Dispatches an official Member Approval welcome email.
 */
export async function sendMemberApprovalEmail(member: {
  name: string;
  email: string;
  registration_id?: string | null;
  department?: string | null;
}): Promise<SendEmailResult> {
  return invokeSendEmail('approval', {
    recipient_email: member.email,
    recipient_name: member.name,
    registration_id: member.registration_id || undefined,
    department: member.department || undefined,
    portal_url: window.location.origin,
  });
}

/**
 * Dispatches an official Member Rejection email with admin feedback.
 */
export async function sendMemberRejectionEmail(
  member: { name: string; email: string },
  rejectionReason: string
): Promise<SendEmailResult> {
  return invokeSendEmail('rejection', {
    recipient_email: member.email,
    recipient_name: member.name,
    rejection_reason: rejectionReason,
  });
}

/**
 * Dispatches a status update email for a Contact Us inquiry.
 */
export async function sendContactUsStatusEmail(
  inquiry: { name: string; email: string; subject?: string },
  newStatus: string,
  adminReply?: string
): Promise<SendEmailResult> {
  return invokeSendEmail('contact_us', {
    recipient_email: inquiry.email,
    recipient_name: inquiry.name,
    subject_topic: inquiry.subject || 'Your Inquiry',
    new_status: newStatus,
    admin_reply: adminReply,
  });
}

/**
 * Dispatches an acknowledgment/status update email for an Event Feedback submission.
 */
export async function sendEventFeedbackEmail(
  feedback: { name: string; email: string; event_title?: string },
  adminNote?: string
): Promise<SendEmailResult> {
  return invokeSendEmail('event_feedback', {
    recipient_email: feedback.email,
    recipient_name: feedback.name,
    event_title: feedback.event_title,
    admin_note: adminNote,
  });
}

/**
 * Broadcasts an event announcement to all registered users.
 */
export async function sendEventBroadcastEmail(
  event: {
    title: string;
    date: string;
    start_time?: string;
    location?: string;
    description?: string;
    image_url?: string;
    slug?: string;
  },
  recipients: Array<{ email: string; name?: string }>
): Promise<SendEmailResult> {
  const eventUrl = event.slug
    ? `${window.location.origin}/events/${event.slug}`
    : `${window.location.origin}/events`;

  return invokeSendEmail('event_broadcast', {
    event_title: event.title,
    event_date: event.date,
    event_time: event.start_time,
    event_venue: event.location,
    event_description: event.description,
    event_poster_url: event.image_url,
    event_url: eventUrl,
    recipients,
  });
}

/**
 * Fetches all registered user emails for event broadcast.
 */
export async function fetchAllRegisteredUsersForBroadcast(): Promise<Array<{ email: string; name?: string }>> {
  if (!isSupabaseConfigured()) return [];

  try {
    // 1. Fetch strictly active members from members table
    const { data: members, error: memErr } = await supabase
      .from('members')
      .select('email, name, status')
      .eq('status', 'active')
      .not('email', 'is', null);

    if (memErr) throw memErr;

    const emailMap = new Map<string, string>();
    members?.forEach((m: any) => {
      if (m.email && m.email.includes('@')) {
        const cleanEmail = m.email.trim().toLowerCase();
        if (!emailMap.has(cleanEmail)) {
          emailMap.set(cleanEmail, m.name || '');
        }
      }
    });

    return Array.from(emailMap.entries()).map(([email, name]) => ({ email, name }));
  } catch (err) {
    console.error('Failed to fetch registered users for broadcast:', err);
    return [];
  }
}

/**
 * Fetches email audit logs with optional category filter and search.
 */
export async function fetchEmailLogs(
  categoryFilter?: EmailCategory | 'all',
  searchQuery?: string
): Promise<EmailLog[]> {
  if (!isSupabaseConfigured()) return [];

  let query = supabase
    .from('email_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (categoryFilter && categoryFilter !== 'all') {
    query = query.eq('category', categoryFilter);
  }

  if (searchQuery && searchQuery.trim()) {
    const s = `%${searchQuery.trim()}%`;
    query = query.or(`recipient_email.ilike.${s},recipient_name.ilike.${s},subject.ilike.${s}`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Failed to fetch email logs:', error);
    return [];
  }

  return (data as EmailLog[]) || [];
}

/**
 * Deletes a single email log record.
 */
export async function deleteEmailLog(logId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;

  const { error } = await supabase.from('email_logs').delete().eq('id', logId);
  if (error) {
    console.error('Failed to delete email log:', error);
    return false;
  }
  return true;
}

export interface EmailStats {
  total: number;
  approvals: number;
  rejections: number;
  inquiries: number;
  broadcasts: number;
  feedbacks: number;
}

/**
 * Fetches universal email metrics directly from backend database across all logs.
 */
export async function fetchEmailStats(): Promise<EmailStats> {
  const defaultStats: EmailStats = {
    total: 0,
    approvals: 0,
    rejections: 0,
    inquiries: 0,
    broadcasts: 0,
    feedbacks: 0,
  };

  if (!isSupabaseConfigured()) return defaultStats;

  try {
    const { data, error } = await supabase
      .from('email_logs')
      .select('category');

    if (error || !data) {
      console.error('Failed to fetch universal email stats:', error);
      return defaultStats;
    }

    return {
      total: data.length,
      approvals: data.filter((r) => r.category === 'approval').length,
      rejections: data.filter((r) => r.category === 'rejection').length,
      inquiries: data.filter((r) => r.category === 'contact_us').length,
      feedbacks: data.filter((r) => r.category === 'event_feedback').length,
      broadcasts: data.filter((r) => r.category === 'event_broadcast').length,
    };
  } catch (err) {
    console.error('Failed to query email stats:', err);
    return defaultStats;
  }
}

