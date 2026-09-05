import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { EmailCategory } from '../types/email';
import {
  DEFAULT_EMAIL_TEMPLATES,
  CATEGORY_VARIABLES,
  type EmailTemplateConfig,
} from '../types/emailTemplate';

const LOCAL_STORAGE_KEY = 'csc_email_templates_cache';

/**
 * Replaces {{placeholder}} tokens in text with values from data map.
 */
export function replaceTemplatePlaceholders(
  text: string,
  data: Record<string, any>
): string {
  if (!text) return '';
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    if (data[key] !== undefined && data[key] !== null) {
      return String(data[key]);
    }
    return match;
  });
}

/**
 * Builds sample mock data for a given category for live preview rendering.
 */
export function getSampleCategoryData(category: EmailCategory): Record<string, any> {
  const vars = CATEGORY_VARIABLES[category] || [];
  const map: Record<string, any> = {};
  for (const v of vars) {
    const rawKey = v.key.replace(/[{}]/g, '');
    map[rawKey] = v.sampleValue;
  }
  return map;
}

/**
 * Fetches all email templates from Supabase with localStorage and default fallbacks.
 */
export async function getAllEmailTemplates(): Promise<Record<EmailCategory, EmailTemplateConfig>> {
  // Start with cloned defaults
  const result: Record<EmailCategory, EmailTemplateConfig> = {
    approval: { ...DEFAULT_EMAIL_TEMPLATES.approval },
    rejection: { ...DEFAULT_EMAIL_TEMPLATES.rejection },
    contact_us: { ...DEFAULT_EMAIL_TEMPLATES.contact_us },
    event_feedback: { ...DEFAULT_EMAIL_TEMPLATES.event_feedback },
    event_broadcast: { ...DEFAULT_EMAIL_TEMPLATES.event_broadcast },
  };

  // Merge from localStorage cache first
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      Object.assign(result, cached);
    }
  } catch {}

  // Fetch from Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('email_templates').select('*');
      if (!error && data && data.length > 0) {
        for (const row of data) {
          const cat = row.category as EmailCategory;
          if (result[cat]) {
            result[cat] = {
              ...result[cat],
              ...row,
              name: row.name || result[cat].name,
              description: row.description || result[cat].description,
            };
          }
        }
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(result));
        } catch {}
      }
    } catch (err) {
      console.warn('Failed to query email_templates from Supabase:', err);
    }
  }

  return result;
}

/**
 * Saves or updates an email template in Supabase and local cache.
 */
export async function saveEmailTemplate(
  template: EmailTemplateConfig
): Promise<EmailTemplateConfig> {
  const now = new Date().toISOString();
  const updated: EmailTemplateConfig = {
    ...template,
    updated_at: now,
  };

  // Update local cache
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const cached = raw ? JSON.parse(raw) : {};
    cached[template.category] = updated;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cached));
  } catch {}

  // Persist to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('email_templates').upsert(
        {
          category: template.category,
          name: template.name,
          subject: template.subject,
          banner_title: template.banner_title || null,
          banner_subtitle: template.banner_subtitle || null,
          headline: template.headline,
          body_text: template.body_text,
          button_text: template.button_text || null,
          button_url: template.button_url || null,
          footer_text: template.footer_text || null,
          is_active: template.is_active ?? true,
          updated_at: now,
        },
        { onConflict: 'category' }
      );
      if (error) {
        console.warn('Failed to upsert email_template to Supabase:', error);
      }
    } catch (err) {
      console.warn('Error saving email template to Supabase:', err);
    }
  }

  return updated;
}

/**
 * Resets a template category back to system default.
 */
export async function resetEmailTemplate(
  category: EmailCategory
): Promise<EmailTemplateConfig> {
  const defaultTemplate = { ...DEFAULT_EMAIL_TEMPLATES[category] };
  return saveEmailTemplate(defaultTemplate);
}

/**
 * Renders full production-grade HTML email from a template and data context.
 */
export function renderEmailHtmlPreview(
  template: EmailTemplateConfig,
  data: Record<string, any>
): string {
  const bannerTitle = replaceTemplatePlaceholders(template.banner_title || 'Cloud Stack Club', data);
  const bannerSubtitle = replaceTemplatePlaceholders(template.banner_subtitle || 'Chandigarh University', data);
  const subject = replaceTemplatePlaceholders(template.subject, data);
  const headline = replaceTemplatePlaceholders(template.headline, data);
  const rawBody = replaceTemplatePlaceholders(template.body_text, data);
  const buttonText = template.button_text ? replaceTemplatePlaceholders(template.button_text, data) : null;
  const buttonUrl = template.button_url ? replaceTemplatePlaceholders(template.button_url, data) : '#';
  const footer = template.footer_text
    ? replaceTemplatePlaceholders(template.footer_text, data)
    : 'This is an official communication from Cloud Stack Club, Chandigarh University.';

  // Format paragraphs from line breaks
  const paragraphs = rawBody
    .split(/\n\n+/)
    .map((p) => `<p style="margin: 0 0 16px 0; color: #475569; font-size: 14px; line-height: 1.6;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  // Structured Info Box based on Category
  let categoryDetailBox = '';
  if (template.category === 'approval') {
    categoryDetailBox = `
      <div style="background-color: #f1f5f9; border-radius: 16px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Membership Details</p>
        <p style="margin: 4px 0; font-size: 14px; color: #1e293b;"><strong>Name:</strong> ${data.name || 'Member'}</p>
        <p style="margin: 4px 0; font-size: 14px; color: #1e293b;"><strong>Registration ID:</strong> ${data.registration_id || 'CSC-26-4892'}</p>
        <p style="margin: 4px 0; font-size: 14px; color: #1e293b;"><strong>Department:</strong> ${data.department || 'Computer Science & Engineering'}</p>
        <p style="margin: 4px 0; font-size: 14px; color: #1e293b;"><strong>Status:</strong> <span style="color: #16a34a; font-weight: 800;">Active Member</span></p>
      </div>
    `;
  } else if (template.category === 'rejection') {
    categoryDetailBox = `
      <div style="background-color: #fff1f2; border-radius: 16px; padding: 20px; margin: 24px 0; border: 1px solid #fecdd3;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #be123c; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Feedback from Review Committee</p>
        <p style="margin: 0; font-size: 14px; color: #881337; line-height: 1.5; font-style: italic;">
          "${data.rejection_reason || 'Application criteria were not met for the current intake cycle.'}"
        </p>
      </div>
    `;
  } else if (template.category === 'contact_us') {
    categoryDetailBox = `
      <div style="background-color: #f8fafc; border-radius: 16px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Administrator Response / Notes</p>
        <p style="margin: 0; font-size: 14px; color: #1e293b; line-height: 1.5;">
          ${data.admin_reply || 'Your inquiry has been acknowledged and processed.'}
        </p>
      </div>
    `;
  } else if (template.category === 'event_feedback') {
    categoryDetailBox = `
      <div style="background-color: #f0fdf4; border-radius: 16px; padding: 20px; margin: 24px 0; border: 1px solid #bbf7d0;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #166534; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Club Remarks</p>
        <p style="margin: 0; font-size: 14px; color: #14532d; line-height: 1.5;">
          ${data.admin_note || 'Thank you for sharing your feedback with us.'}
        </p>
      </div>
    `;
  } else if (template.category === 'event_broadcast') {
    categoryDetailBox = `
      <div style="background-color: #f1f5f9; border-radius: 16px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Event Logistics</p>
        <p style="margin: 4px 0; font-size: 14px; color: #1e293b;">📅 <strong>Date:</strong> ${data.event_date || 'September 15, 2026'}</p>
        <p style="margin: 4px 0; font-size: 14px; color: #1e293b;">⏰ <strong>Time:</strong> ${data.event_time || '10:00 AM - 04:00 PM'}</p>
        <p style="margin: 4px 0; font-size: 14px; color: #1e293b;">📍 <strong>Venue:</strong> ${data.event_venue || 'Auditorium 3, Chandigarh University'}</p>
      </div>
    `;
  }

  // Action Button
  const buttonHtml = buttonText
    ? `
      <div style="margin-top: 32px; text-align: center;">
        <a href="${buttonUrl}" target="_blank" rel="noopener noreferrer" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 14px; font-weight: 700; font-size: 14px; display: inline-block;">
          ${buttonText}
        </a>
      </div>
    `
    : '';

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
      /* Club Sleek Scrollbar Theme */
      ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: rgba(148, 163, 184, 0.4);
        border-radius: 8px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(148, 163, 184, 0.7);
      }
      html, body {
        scrollbar-width: thin;
        scrollbar-color: rgba(148, 163, 184, 0.4) transparent;
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 30px 10px;">
      <tr>
        <td align="center">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
            <!-- Header Banner -->
            <tr>
              <td style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #0284c7 100%); padding: 36px 32px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">${bannerTitle}</h1>
                <p style="margin: 6px 0 0 0; color: #93c5fd; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">${bannerSubtitle}</p>
              </td>
            </tr>
            <!-- Content Area -->
            <tr>
              <td style="padding: 36px 32px;">
                <h2 style="color: #1e293b; font-size: 20px; font-weight: 800; margin-top: 0; margin-bottom: 16px;">${headline}</h2>
                ${paragraphs}
                ${categoryDetailBox}
                ${buttonHtml}
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 32px; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 500; line-height: 1.5;">
                  ${footer}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}
