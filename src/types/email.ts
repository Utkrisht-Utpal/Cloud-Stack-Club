export type EmailCategory =
  | 'approval'
  | 'rejection'
  | 'contact_us'
  | 'event_feedback'
  | 'event_broadcast';

export type EmailStatus = 'sent' | 'failed';

export interface EmailLog {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  category: EmailCategory;
  status: EmailStatus;
  metadata: Record<string, any>;
  error_message: string | null;
  sent_by: string | null;
  sent_by_name?: string | null;
  sent_by_email?: string | null;
  created_at: string;
}

export interface SendEmailResult {
  success: boolean;
  sentCount?: number;
  failedCount?: number;
  total?: number;
  error?: string;
  results?: Array<{ email: string; status: string; error?: string }>;
}
