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
  member_id?: string | null;
  department?: string | null;
}): Promise<SendEmailResult> {
  const memId = member.member_id || undefined;
  return invokeSendEmail('approval', {
    recipient_email: member.email,
    recipient_name: member.name,
    member_id: memId,
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
 * Dispatches a diagnostic test email to test recipient domain deliverability.
 * Modes: 'plain_text' | 'minimal_html' | 'full_template'
 */
export async function sendDiagnosticTestEmail(
  recipientEmail: string,
  testMode: 'plain_text' | 'minimal_html' | 'full_template' = 'minimal_html',
  recipientName?: string
): Promise<SendEmailResult> {
  return invokeSendEmail('test_diagnostic', {
    recipient_email: recipientEmail,
    test_mode: testMode,
    recipient_name: recipientName || 'Diagnostic Tester',
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
 * Dispatches an automated confirmation email to an individual event registrant.
 */
export async function sendIndividualRegistrationEmail(params: {
  email: string;
  name: string;
  uid: string;
  phone?: string | null;
  department?: string | null;
  year?: string | null;
  event_title: string;
  event_date: string;
  event_time?: string | null;
  event_venue?: string | null;
  registration_number?: string | null;
}): Promise<SendEmailResult> {
  return invokeSendEmail('event_registration_individual', {
    recipient_email: params.email,
    recipient_name: params.name,
    uid: params.uid,
    department: params.department || undefined,
    year: params.year || undefined,
    event_title: params.event_title,
    event_date: params.event_date,
    event_time: params.event_time || undefined,
    event_venue: params.event_venue || undefined,
    registration_number: params.registration_number || undefined,
  });
}

/**
 * Dispatches an automated confirmation email to a Team Leader.
 */
export async function sendTeamLeaderRegistrationEmail(params: {
  leader_email: string;
  leader_name: string;
  leader_uid: string;
  leader_phone?: string | null;
  leader_department?: string | null;
  leader_year?: string | null;
  leader_registration_number?: string | null;
  team_name: string;
  team_members: Array<{ name: string; email?: string | null; uid?: string | null; department?: string | null; year?: string | null; phone?: string | null; registration_number?: string | null }>;
  event_title: string;
  event_date: string;
  event_time?: string | null;
  event_venue?: string | null;
  registration_number?: string | null;
  team_registration_number?: string | null;
}): Promise<SendEmailResult> {
  const teamRegId = params.team_registration_number || params.registration_number || undefined;
  const leaderRegId = params.leader_registration_number || undefined;

  return invokeSendEmail('event_registration_team_leader', {
    recipient_email: params.leader_email,
    recipient_name: params.leader_name,
    name: params.leader_name,
    uid: params.leader_uid,
    department: params.leader_department || undefined,
    year: params.leader_year || undefined,
    leader_registration_number: leaderRegId,
    team_name: params.team_name,
    team_members: params.team_members,
    team_size: (params.team_members.length + 1).toString(),
    event_title: params.event_title,
    event_date: params.event_date,
    event_time: params.event_time || undefined,
    event_venue: params.event_venue || undefined,
    registration_number: teamRegId,
    team_registration_number: teamRegId,
  });
}

/**
 * Dispatches an automated notification email to a Team Member.
 */
export async function sendTeamMemberRegistrationEmail(params: {
  member_email: string;
  member_name: string;
  member_uid?: string | null;
  member_department?: string | null;
  member_year?: string | null;
  member_registration_number?: string | null;
  leader_name: string;
  leader_email?: string | null;
  leader_uid: string;
  leader_department?: string | null;
  leader_year?: string | null;
  leader_registration_number?: string | null;
  team_name: string;
  other_members: Array<{ name: string; department?: string | null; year?: string | null; uid?: string | null; registration_number?: string | null }>;
  event_title: string;
  event_date: string;
  event_time?: string | null;
  event_venue?: string | null;
  registration_number?: string | null;
  team_registration_number?: string | null;
}): Promise<SendEmailResult> {
  const teamRegId = params.team_registration_number || params.registration_number || undefined;

  return invokeSendEmail('event_registration_team_member', {
    recipient_email: params.member_email,
    recipient_name: params.member_name,
    name: params.member_name,
    uid: params.member_uid || undefined,
    department: params.member_department || undefined,
    year: params.member_year || undefined,
    member_registration_number: params.member_registration_number || undefined,
    leader_name: params.leader_name,
    leader_email: params.leader_email || undefined,
    leader_uid: params.leader_uid,
    leader_department: params.leader_department || undefined,
    leader_year: params.leader_year || undefined,
    leader_registration_number: params.leader_registration_number || undefined,
    team_name: params.team_name,
    other_members: params.other_members,
    event_title: params.event_title,
    event_date: params.event_date,
    event_time: params.event_time || undefined,
    event_venue: params.event_venue || undefined,
    registration_number: teamRegId,
    team_registration_number: teamRegId,
  });
}

/**
 * Dispatches registration emails to both the Team Leader and all Team Members concurrently.
 */
export async function sendTeamRegistrationEmails(params: {
  event_title: string;
  event_date: string;
  event_time?: string | null;
  event_venue?: string | null;
  team_name: string;
  team_registration_number?: string | null;
  leader: { name: string; email: string; uid: string; department?: string | null; year?: string | null; phone?: string | null; registration_number?: string | null };
  members: Array<{ name: string; email: string; uid?: string | null; department?: string | null; year?: string | null; phone?: string | null; registration_number?: string | null }>;
  registration_number?: string | null;
}): Promise<{ leaderResult: SendEmailResult; memberResults: SendEmailResult[] }> {
  const teamRegId = params.team_registration_number || params.registration_number || null;
  const leaderRegId = params.leader.registration_number || null;

  const leaderPromise = sendTeamLeaderRegistrationEmail({
    leader_email: params.leader.email,
    leader_name: params.leader.name,
    leader_uid: params.leader.uid,
    leader_phone: params.leader.phone,
    leader_department: params.leader.department,
    leader_year: params.leader.year,
    leader_registration_number: leaderRegId,
    team_name: params.team_name,
    team_members: params.members,
    event_title: params.event_title,
    event_date: params.event_date,
    event_time: params.event_time,
    event_venue: params.event_venue,
    registration_number: teamRegId,
    team_registration_number: teamRegId,
  });

  const memberPromises = params.members
    .filter((m) => m.email && m.email.trim())
    .map((m) => {
      const otherMembers = params.members
        .filter((other) => other.email !== m.email || other.name !== m.name)
        .map((other) => ({
          name: other.name,
          department: other.department,
          year: other.year,
          uid: other.uid,
          registration_number: other.registration_number,
        }));

      return sendTeamMemberRegistrationEmail({
        member_email: m.email,
        member_name: m.name,
        member_uid: m.uid,
        member_department: m.department,
        member_year: m.year,
        member_registration_number: m.registration_number || null,
        leader_name: params.leader.name,
        leader_email: params.leader.email,
        leader_uid: params.leader.uid,
        leader_department: params.leader.department,
        leader_year: params.leader.year,
        leader_registration_number: leaderRegId,
        team_name: params.team_name,
        other_members: otherMembers,
        event_title: params.event_title,
        event_date: params.event_date,
        event_time: params.event_time,
        event_venue: params.event_venue,
        registration_number: teamRegId,
        team_registration_number: teamRegId,
      });
    });

  const [leaderResult, ...memberResults] = await Promise.all([leaderPromise, ...memberPromises]);
  return { leaderResult, memberResults };
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

