import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { EmailCategory } from '../types/email';
import {
  DEFAULT_EMAIL_TEMPLATES,
  CATEGORY_VARIABLES,
  BANNER_THEME_GRADIENTS,
  type EmailTemplateConfig,
  type BannerStyle,
  type BannerTheme,
  type BannerTextColor,
  type InstitutionalThemeConfig,
} from '../types/emailTemplate';

const LOCAL_STORAGE_KEY = 'csc_email_templates_cache';

/**
 * Formats date into readable string: e.g. "Tuesday, September 15, 2026"
 */
export function formatEventDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const clean = dateStr.trim();
    if (/^[A-Za-z]+,\s+[A-Za-z]+/.test(clean)) return clean;
    const parts = clean.split('T')[0].split('-');
    let d: Date;
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      d = new Date(year, month, day, 12, 0, 0);
    } else {
      d = new Date(clean);
    }
    if (isNaN(d.getTime())) return clean;
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Formats single time string into 12-hour format with AM/PM: e.g. "13:30:00" -> "01:30 PM"
 */
function formatSingleTime(t: string): string {
  const clean = t.trim();
  if (!clean) return '';
  if (/am|pm/i.test(clean)) return clean;
  const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return clean;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
  return `${formattedHours}:${minutes} ${ampm}`;
}

/**
 * Formats time into 12-hour format with AM/PM (starting time only)
 */
export function formatEventTime(timeStr?: string): string {
  if (!timeStr) return '';
  try {
    let startPart = timeStr.trim();
    if (startPart.includes(' - ')) {
      startPart = startPart.split(' - ')[0].trim();
    } else if (startPart.includes(' to ')) {
      startPart = startPart.split(' to ')[0].trim();
    }
    return formatSingleTime(startPart);
  } catch {
    return timeStr;
  }
}

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
    event_registration_individual: { ...DEFAULT_EMAIL_TEMPLATES.event_registration_individual },
    event_registration_team_leader: { ...DEFAULT_EMAIL_TEMPLATES.event_registration_team_leader },
    event_registration_team_member: { ...DEFAULT_EMAIL_TEMPLATES.event_registration_team_member },
  };

  // Merge from localStorage cache first
  const localCache: Record<string, EmailTemplateConfig> = {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      Object.assign(localCache, cached);
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
            const localItem = localCache[cat];
            const dbTime = row.updated_at ? new Date(row.updated_at).getTime() : 0;
            const localTime = localItem?.updated_at ? new Date(localItem.updated_at).getTime() : 0;

            if (localTime > dbTime) {
              result[cat] = {
                ...row,
                ...localItem,
              };
            } else {
              result[cat] = {
                ...result[cat],
                ...row,
                name: row.name || result[cat].name,
                description: row.description || result[cat].description,
                ...(localItem?.institutional_theme && !row.institutional_theme
                  ? { institutional_theme: localItem.institutional_theme }
                  : {}),
              };
            }
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

  // Update local cache immediately
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const cached = raw ? JSON.parse(raw) : {};
    cached[template.category] = updated;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cached));
  } catch {}

  // Persist to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const upsertObj: Record<string, any> = {
        category: template.category,
        name: template.name,
        subject: template.subject,
        banner_style: template.banner_style || 'modern_badge',
        banner_theme: template.banner_theme || 'classic_blue',
        banner_text_color: template.banner_text_color || 'white',
        banner_title: template.banner_title || null,
        banner_subtitle: template.banner_subtitle || null,
        headline: template.headline,
        body_text: template.body_text,
        notice_text: template.notice_text || null,
        button_text: template.button_text || null,
        button_url: template.button_url || null,
        footer_text: template.footer_text || null,
        is_active: template.is_active ?? true,
        updated_at: now,
      };
      if (template.institutional_theme) {
        upsertObj.institutional_theme = template.institutional_theme;
      }
      let { error } = await supabase.from('email_templates').upsert(
        upsertObj,
        { onConflict: 'category' }
      );
      if (error && (upsertObj.institutional_theme || upsertObj.notice_text)) {
        // Fallback: If DB table schema doesn't have newest columns yet, upsert remaining standard columns
        delete upsertObj.institutional_theme;
        delete upsertObj.notice_text;
        const retry = await supabase.from('email_templates').upsert(
          upsertObj,
          { onConflict: 'category' }
        );
        error = retry.error;
      }
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
 * Applies a banner style, color theme, and text color to a specific set of email categories.
 */
export async function applyBannerDesignToCategories(
  categories: EmailCategory[],
  style: BannerStyle,
  theme: BannerTheme,
  textColor?: BannerTextColor
): Promise<Record<EmailCategory, EmailTemplateConfig>> {
  const allTemplates = await getAllEmailTemplates();

  for (const cat of categories) {
    if (allTemplates[cat]) {
      allTemplates[cat] = {
        ...allTemplates[cat],
        banner_style: style,
        banner_theme: theme,
        ...(textColor ? { banner_text_color: textColor } : {}),
      };
      await saveEmailTemplate(allTemplates[cat]);
    }
  }

  return allTemplates;
}

/**
 * Applies a banner style, color theme, and text color across all email templates (Global Default).
 */
export async function applyGlobalBannerDesign(
  style: BannerStyle,
  theme: BannerTheme,
  textColor?: BannerTextColor
): Promise<Record<EmailCategory, EmailTemplateConfig>> {
  const categories: EmailCategory[] = [
    'approval',
    'rejection',
    'contact_us',
    'event_feedback',
    'event_broadcast',
    'event_registration_individual',
    'event_registration_team_leader',
    'event_registration_team_member',
  ];
  return applyBannerDesignToCategories(categories, style, theme, textColor);
}

/**
 * Applies an institutional theme configuration across selected email templates.
 */
export async function applyInstitutionalDesignToCategories(
  categories: EmailCategory[],
  institutionalTheme: InstitutionalThemeConfig
): Promise<Record<EmailCategory, EmailTemplateConfig>> {
  const allTemplates = await getAllEmailTemplates();
  for (const cat of categories) {
    if (allTemplates[cat]) {
      allTemplates[cat] = {
        ...allTemplates[cat],
        institutional_theme: { ...institutionalTheme },
      };
      await saveEmailTemplate(allTemplates[cat]);
    }
  }
  return allTemplates;
}

/**
 * Check if recipient belongs to Chandigarh University institutional domains
 */
export function isInstitutionalRecipient(email?: string): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return (
    clean.endsWith('@cuchd.in') ||
    clean.endsWith('@cumail.in') ||
    clean.includes('.cuchd.in') ||
    clean.includes('.cumail.in')
  );
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
  data: Record<string, any>,
  previewFormat: 'standard' | 'institutional' = 'standard'
): string {
  const isInst = previewFormat === 'institutional' || (previewFormat !== 'standard' && isInstitutionalRecipient(data.email));

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
  const rawNotice = template.notice_text ? replaceTemplatePlaceholders(template.notice_text, data) : '';

  if (isInst) {
    const instTheme = template.institutional_theme || {};
    const canvasBg = instTheme.canvasBg || '#181818';
    const cardBg = instTheme.cardBg || '#252525';
    const cardBorder = instTheme.cardBorder || '#383838';
    const headerSubColor = instTheme.headerSubtitleColor || '#38bdf8';
    const titleColor = instTheme.headlineColor || '#fa7c64';
    const bodyColor = instTheme.bodyTextColor || '#e2e8f0';
    const btnBg = instTheme.buttonBg || '#16a34a';
    const btnTextColor = instTheme.buttonTextColor || '#ffffff';
    const btnBoxBg = instTheme.buttonContainerBg || '#1a261f';
    const btnBoxBorder = instTheme.buttonContainerBorder || '#2d4d38';
    const linkColor = instTheme.linkColor || '#4ade80';
    const noticeBg = instTheme.noticeBg || '#382723';
    const noticeBorder = instTheme.noticeBorder || '#f97316';
    const noticeTextColor = instTheme.noticeTextColor || '#fdba74';
    const footerTextColor = instTheme.footerTextColor || '#94a3b8';
    const footerLinkColor = instTheme.footerLinkColor || '#38bdf8';

    let noticeInstHtml = '';
    if (rawNotice && rawNotice.trim()) {
      const noticeParagraphs = rawNotice
        .split(/\n\n+/)
        .map((p) => `<p style="margin: 0 0 8px 0; line-height: 1.5;">${p.replace(/\n/g, '<br/>')}</p>`)
        .join('')
        .replace(/<p style="margin: 0 0 8px 0; line-height: 1.5;">(.*?)<\/p>$/, '<p style="margin: 0; line-height: 1.5;">$1</p>');

      noticeInstHtml = `
        <div style="background-color: ${noticeBg}; border-left: 4px solid ${noticeBorder}; border-radius: 8px; padding: 14px 18px; margin: 20px 0; color: ${noticeTextColor}; font-size: 13.5px; font-weight: 500; line-height: 1.5;">
          ${noticeParagraphs}
        </div>
      `;
    }

    const paragraphs = rawBody
      .split(/\n\n+/)
      .map((p) => `<p style="margin: 0 0 16px 0; color: ${bodyColor}; font-size: 14px; line-height: 1.65;">${p.replace(/\n/g, '<br/>')}</p>`)
      .join('');

    let detailBox = '';
    if (template.category === 'approval') {
      detailBox = `
        <div style="background-color: #1e1e1e; border-radius: 12px; padding: 18px 20px; margin: 24px 0; border: 1px solid ${cardBorder};">
          <p style="margin: 0 0 10px 0; font-size: 11px; color: ${footerTextColor}; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Membership Details</p>
          <p style="margin: 4px 0; font-size: 14px; color: ${bodyColor};"><strong style="color: #ffffff;">Name:</strong> ${data.name || 'Member'}</p>
          <p style="margin: 4px 0; font-size: 14px; color: ${bodyColor};"><strong style="color: #ffffff;">Member ID:</strong> ${data.member_id || 'CSC-26-4892'}</p>
          <p style="margin: 4px 0; font-size: 14px; color: ${bodyColor};"><strong style="color: #ffffff;">Department:</strong> ${data.department || 'Computer Science & Engineering'}</p>
          <p style="margin: 4px 0; font-size: 14px; color: ${bodyColor};"><strong style="color: #ffffff;">Status:</strong> <span style="color: ${linkColor}; font-weight: 800;">Active Member</span></p>
        </div>
      `;
    } else if (template.category === 'rejection') {
      detailBox = `
        <div style="background-color: ${noticeBg}; border-left: 4px solid ${noticeBorder}; border-radius: 8px; padding: 14px 18px; margin: 24px 0; color: ${noticeTextColor}; font-size: 13.5px; font-weight: 500; line-height: 1.5;">
          <p style="margin: 0 0 6px 0; font-size: 11px; color: ${noticeBorder}; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Feedback from Review Committee</p>
          <p style="margin: 0; font-style: italic;">"${data.rejection_reason || 'Application criteria were not met for the current intake cycle.'}"</p>
        </div>
      `;
    } else if (template.category === 'contact_us') {
      detailBox = `
        <div style="background-color: #1e1e1e; border-radius: 12px; padding: 18px 20px; margin: 24px 0; border: 1px solid ${cardBorder};">
          <p style="margin: 0 0 10px 0; font-size: 11px; color: ${footerTextColor}; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Inquiry Status: <span style="color: ${headerSubColor}; font-weight: 800;">${(data.new_status || 'RESOLVED').toUpperCase()}</span></p>
          <div style="margin-top: 10px; padding: 12px 14px; background-color: #252525; border-radius: 8px; border: 1px solid #333333;">
            <p style="margin: 0 0 4px 0; font-size: 11px; color: ${footerTextColor}; font-weight: 700; text-transform: uppercase;">Administrator Response:</p>
            <p style="margin: 0; font-size: 13.5px; color: ${bodyColor}; line-height: 1.5;">${data.admin_reply || 'Your query has been acknowledged and processed.'}</p>
          </div>
        </div>
      `;
    } else if (template.category === 'event_feedback') {
      detailBox = `
        <div style="background-color: #1e1e1e; border-radius: 12px; padding: 18px 20px; margin: 24px 0; border: 1px solid ${cardBorder};">
          <p style="margin: 0 0 8px 0; font-size: 11px; color: ${linkColor}; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Club Remarks</p>
          <p style="margin: 0; font-size: 13.5px; color: ${bodyColor}; line-height: 1.5;">${data.admin_note || 'Thank you for sharing your feedback with us.'}</p>
        </div>
      `;
    } else if (template.category === 'event_broadcast') {
      const formattedDate = formatEventDate(data.event_date);
      const formattedTime = formatEventTime(data.event_time);
      detailBox = `
        <div style="background-color: #1e1e1e; border-radius: 12px; padding: 18px 20px; margin: 24px 0; border: 1px solid ${cardBorder};">
          <p style="margin: 0 0 10px 0; font-size: 11px; color: ${footerTextColor}; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Event Logistics</p>
          ${formattedDate ? `<p style="margin: 4px 0; font-size: 14px; color: ${bodyColor};"><strong style="color: #ffffff;">Date:</strong> ${formattedDate}</p>` : ''}
          ${formattedTime ? `<p style="margin: 4px 0; font-size: 14px; color: ${bodyColor};"><strong style="color: #ffffff;">Time:</strong> ${formattedTime}</p>` : ''}
          ${data.event_venue ? `<p style="margin: 4px 0; font-size: 14px; color: ${bodyColor};"><strong style="color: #ffffff;">Venue:</strong> ${data.event_venue}</p>` : ''}
        </div>
      `;
    } else if (template.category === 'event_registration_individual') {
      const formattedDate = formatEventDate(data.event_date);
      const formattedTime = formatEventTime(data.event_time);
      const deptYear = [data.department, data.year].filter(Boolean).join(' - ');
      const participantDisplay = deptYear ? `${data.name || 'Participant'} (${deptYear})` : (data.name || 'Participant');
      detailBox = `
        <div style="background-color: #1e1e1e; border-radius: 12px; padding: 18px 20px; margin: 24px 0; border: 1px solid ${cardBorder};">
          <p style="margin: 0 0 12px 0; font-size: 11px; color: ${footerTextColor}; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Registration & Event Details</p>
          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size: 14px; color: ${bodyColor}; line-height: 1.8;">
            <tr>
              <td style="padding: 3px 0; width: 140px; color: ${footerTextColor};"><strong>Event:</strong></td>
              <td style="padding: 3px 0; font-weight: 700; color: #ffffff;">${data.event_title || 'Club Event'}</td>
            </tr>
            ${formattedDate ? `
            <tr>
              <td style="padding: 3px 0; color: ${footerTextColor};"><strong>Date:</strong></td>
              <td style="padding: 3px 0; color: ${bodyColor};">${formattedDate}</td>
            </tr>` : ''}
            ${formattedTime ? `
            <tr>
              <td style="padding: 3px 0; color: ${footerTextColor};"><strong>Time:</strong></td>
              <td style="padding: 3px 0; color: ${bodyColor};">${formattedTime}</td>
            </tr>` : ''}
            ${data.event_venue ? `
            <tr>
              <td style="padding: 3px 0; color: ${footerTextColor};"><strong>Venue:</strong></td>
              <td style="padding: 3px 0; color: ${bodyColor};">${data.event_venue}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 3px 0; color: ${footerTextColor};"><strong>Participant:</strong></td>
              <td style="padding: 3px 0; font-weight: 600; color: #ffffff;">${participantDisplay}</td>
            </tr>
            ${data.uid ? `
            <tr>
              <td style="padding: 3px 0; color: ${footerTextColor};"><strong>University ID:</strong></td>
              <td style="padding: 3px 0; font-family: monospace; font-weight: 700; color: ${headerSubColor};">${data.uid}</td>
            </tr>` : ''}
            ${data.registration_number ? `
            <tr>
              <td style="padding: 3px 0; color: ${footerTextColor};"><strong>Registration ID:</strong></td>
              <td style="padding: 3px 0; font-family: monospace; font-weight: 700; color: #ffffff;">${data.registration_number}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 3px 0; color: ${footerTextColor};"><strong>Pass Status:</strong></td>
              <td style="padding: 3px 0;"><span style="display: inline-block; background-color: #14532d; color: #4ade80; font-weight: 800; font-size: 11px; padding: 2px 10px; border-radius: 9999px; border: 1px solid #22c55e;">CONFIRMED</span></td>
            </tr>
          </table>
        </div>
      `;
    } else if (template.category === 'event_registration_team_leader') {
      const formattedDate = formatEventDate(data.event_date);
      const formattedTime = formatEventTime(data.event_time);
      const leaderDeptYear = [data.department || data.leader_department, data.year || data.leader_year].filter(Boolean).join(' - ');
      const leaderDisplay = leaderDeptYear ? `${data.name || data.leader_name || 'Team Leader'} (${leaderDeptYear})` : (data.name || data.leader_name || 'Team Leader');
      const leaderUid = data.uid || data.leader_uid || '';
      const leaderRegId = data.leader_registration_number || data.leader_pass_id || '';
      const teamRegId = data.team_registration_number || data.registration_number || '';

      const membersList: Array<{ name: string; department?: string; year?: string; uid?: string; registration_number?: string }> =
        data.team_members && Array.isArray(data.team_members) && data.team_members.length > 0
          ? data.team_members
          : [
              { name: 'Riya Patel', department: 'Computer Science & Engineering', year: '3rd Year', uid: '22BCS10892', registration_number: 'REG-26-8892' },
              { name: 'Karan Singh', department: 'Information Technology', year: '3rd Year', uid: '22BCS10915', registration_number: 'REG-26-8893' },
            ];

      const membersHtml = membersList
        .map((m) => {
          const mDeptYear = [m.department, m.year].filter(Boolean).join(' - ');
          return `
            <li style="margin: 6px 0; color: ${bodyColor};">
              <span><strong style="color: #ffffff;">${m.name}</strong>${mDeptYear ? ` <span style="color: ${footerTextColor};">(${mDeptYear})</span>` : ''}</span>
              ${m.registration_number ? `<span style="display: block; font-family: monospace; font-size: 12px; color: ${bodyColor}; margin-top: 2px;">Registration ID: <strong>${m.registration_number}</strong></span>` : ''}
              ${m.uid ? `<span style="display: block; font-family: monospace; font-size: 12px; color: ${footerTextColor}; margin-top: 2px;">UID: <strong style="color: ${headerSubColor};">${m.uid}</strong></span>` : ''}
            </li>
          `;
        })
        .join('');

      detailBox = `
        <div style="background-color: #1e1e1e; border-radius: 12px; padding: 18px 20px; margin: 24px 0; border: 1px solid ${cardBorder};">
          <p style="margin: 0 0 12px 0; font-size: 11px; color: ${footerTextColor}; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Team Registration Summary</p>
          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size: 14px; color: ${bodyColor}; line-height: 1.8;">
            <tr>
              <td style="padding: 3px 0; width: 140px; color: ${footerTextColor};"><strong>Event:</strong></td>
              <td style="padding: 3px 0; font-weight: 700; color: #ffffff;">${data.event_title || 'Club Event'}</td>
            </tr>
            ${formattedDate ? `
            <tr>
              <td style="padding: 3px 0; color: ${footerTextColor};"><strong>Date:</strong></td>
              <td style="padding: 3px 0; color: ${bodyColor};">${formattedDate}</td>
            </tr>` : ''}
            ${formattedTime ? `
            <tr>
              <td style="padding: 3px 0; color: ${footerTextColor};"><strong>Time:</strong></td>
              <td style="padding: 3px 0; color: ${bodyColor};">${formattedTime}</td>
            </tr>` : ''}
            ${data.event_venue ? `
            <tr>
              <td style="padding: 3px 0; color: ${footerTextColor};"><strong>Venue:</strong></td>
              <td style="padding: 3px 0; color: ${bodyColor};">${data.event_venue}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 3px 0; color: ${footerTextColor};"><strong>Team Name:</strong></td>
              <td style="padding: 3px 0; font-weight: 800; color: ${headerSubColor}; font-size: 15px;">${data.team_name || 'Club Team'}</td>
            </tr>
            ${teamRegId ? `
            <tr>
              <td style="padding: 3px 0; color: ${footerTextColor};"><strong>Team Reg ID:</strong></td>
              <td style="padding: 3px 0; font-family: monospace; font-weight: 700; color: #ffffff;">${teamRegId}</td>
            </tr>` : ''}
          </table>

          <div style="margin-top: 14px; padding: 12px 14px; background-color: #252525; border-radius: 8px; border: 1px solid ${cardBorder};">
            <p style="margin: 0 0 4px 0; font-size: 11px; color: ${headerSubColor}; font-weight: 800; text-transform: uppercase;">Team Leader</p>
            <p style="margin: 0; font-size: 14px; font-weight: 700; color: #ffffff;">${leaderDisplay}</p>
            ${leaderUid ? `<p style="margin: 3px 0 0 0; font-size: 12px; font-family: monospace; color: ${footerTextColor};">UID: <strong style="color: ${headerSubColor};">${leaderUid}</strong></p>` : ''}
            ${leaderRegId ? `<p style="margin: 3px 0 0 0; font-size: 12px; color: ${footerTextColor};">Registration ID: <strong style="color: #ffffff;">${leaderRegId}</strong></p>` : ''}
          </div>

          ${membersList.length > 0 ? `
          <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed ${cardBorder};">
            <p style="margin: 0 0 8px 0; font-size: 11px; color: ${footerTextColor}; font-weight: 700; text-transform: uppercase;">Registered Teammates (${membersList.length})</p>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8;">
              ${membersHtml}
            </ul>
          </div>` : ''}
        </div>
      `;
    } else if (template.category === 'event_registration_team_member') {
      const formattedDate = formatEventDate(data.event_date);
      const formattedTime = formatEventTime(data.event_time);
      const leaderDeptYear = [data.leader_department, data.leader_year].filter(Boolean).join(' - ');
      const leaderDisplay = leaderDeptYear ? `${data.leader_name || 'Team Leader'} (${leaderDeptYear})` : (data.leader_name || 'Team Leader');
      const leaderUid = data.leader_uid || '';
      const leaderRegId = data.leader_registration_number || '';
      const teamRegId = data.team_registration_number || data.registration_number || '';
      const memberRegId = data.member_registration_number || '';

      const otherMembersList: Array<{ name: string; department?: string; year?: string; registration_number?: string }> =
        data.other_members && Array.isArray(data.other_members) && data.other_members.length > 0
          ? data.other_members
          : (data.team_members && Array.isArray(data.team_members) && data.team_members.length > 0)
          ? data.team_members
          : [
              { name: 'Karan Singh', department: 'Information Technology', year: '3rd Year' },
              { name: 'Sneha Roy', department: 'Computer Science & Engineering', year: '3rd Year' },
            ];

      const otherMembersHtml = otherMembersList
        .map((m) => {
          const mDeptYear = [m.department, m.year].filter(Boolean).join(' - ');
          return `
            <li style="margin: 4px 0; color: ${bodyColor};">
              <strong style="color: #ffffff;">${m.name}</strong>${mDeptYear ? ` <span style="color: ${footerTextColor};">(${mDeptYear})</span>` : ''}
            </li>
          `;
        })
        .join('');

      detailBox = `
        <div style="background-color: #1e1e1e; border-radius: 12px; padding: 18px 20px; margin: 24px 0; border: 1px solid ${cardBorder};">
          <p style="margin: 0 0 12px 0; font-size: 11px; color: ${footerTextColor}; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Team Registration Details</p>
          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size: 14px; color: ${bodyColor}; line-height: 1.8;">
            <tr>
              <td style="padding: 3px 0; width: 140px; color: ${footerTextColor};"><strong>Event:</strong></td>
              <td style="padding: 3px 0; font-weight: 700; color: #ffffff;">${data.event_title || 'Club Event'}</td>
            </tr>
            ${formattedDate ? `
            <tr>
              <td style="padding: 3px 0; color: ${footerTextColor};"><strong>Date:</strong></td>
              <td style="padding: 3px 0; color: ${bodyColor};">${formattedDate}</td>
            </tr>` : ''}
            ${formattedTime ? `
            <tr>
              <td style="padding: 3px 0; color: ${footerTextColor};"><strong>Time:</strong></td>
              <td style="padding: 3px 0; color: ${bodyColor};">${formattedTime}</td>
            </tr>` : ''}
            ${data.event_venue ? `
            <tr>
              <td style="padding: 3px 0; color: ${footerTextColor};"><strong>Venue:</strong></td>
              <td style="padding: 3px 0; color: ${bodyColor};">${data.event_venue}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 3px 0; color: ${footerTextColor};"><strong>Your Team:</strong></td>
              <td style="padding: 3px 0; font-weight: 800; color: ${headerSubColor}; font-size: 15px;">${data.team_name || 'Club Team'}</td>
            </tr>
            ${teamRegId ? `
            <tr>
              <td style="padding: 3px 0; color: ${footerTextColor};"><strong>Team Reg ID:</strong></td>
              <td style="padding: 3px 0; font-family: monospace; font-weight: 700; color: #ffffff;">${teamRegId}</td>
            </tr>` : ''}
            ${memberRegId ? `
            <tr>
              <td style="padding: 3px 0; color: ${footerTextColor};"><strong>Your Reg ID:</strong></td>
              <td style="padding: 3px 0; font-family: monospace; font-weight: 700; color: #ffffff;">${memberRegId}</td>
            </tr>` : ''}
          </table>

          <div style="margin-top: 14px; padding: 12px 14px; background-color: #252525; border-radius: 8px; border: 1px solid ${cardBorder};">
            <p style="margin: 0 0 4px 0; font-size: 11px; color: ${headerSubColor}; font-weight: 800; text-transform: uppercase;">Team Leader</p>
            <p style="margin: 0; font-size: 14px; font-weight: 700; color: #ffffff;">${leaderDisplay}</p>
            ${leaderUid ? `<p style="margin: 3px 0 0 0; font-size: 12px; font-family: monospace; color: ${footerTextColor};">UID: <strong style="color: ${headerSubColor};">${leaderUid}</strong></p>` : ''}
            ${leaderRegId ? `<p style="margin: 3px 0 0 0; font-size: 12px; color: ${footerTextColor};">Registration ID: <strong style="color: #ffffff;">${leaderRegId}</strong></p>` : ''}
            ${data.leader_email ? `<p style="margin: 2px 0 0 0; font-size: 12px; color: ${footerTextColor};">Email: ${data.leader_email}</p>` : ''}
          </div>

          ${otherMembersList.length > 0 ? `
          <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed ${cardBorder};">
            <p style="margin: 0 0 8px 0; font-size: 11px; color: ${footerTextColor}; font-weight: 700; text-transform: uppercase;">Other Team Members</p>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8;">
              ${otherMembersHtml}
            </ul>
          </div>` : ''}
        </div>
      `;
    }

    const ctaHtml = buttonText
      ? `
        <div style="background-color: ${btnBoxBg}; border: 1px solid ${btnBoxBorder}; border-radius: 12px; padding: 22px 18px; text-align: center; margin: 24px 0;">
          <div style="color: ${linkColor}; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 14px;">OFFICIAL ACTION LINK</div>
          <a href="${buttonUrl}" style="background-color: ${btnBg}; color: ${btnTextColor}; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
            ${buttonText}
          </a>
          <div style="margin-top: 10px;">
            <a href="${buttonUrl}" style="color: ${linkColor}; font-size: 11px; text-decoration: underline; word-break: break-all;">${buttonUrl}</a>
          </div>
        </div>
      `
      : '';

    const footerInstContent = (footer || '')
      .split(/\n\n+/)
      .map(
        (p, idx, arr) =>
          `<p style="margin: 0${idx < arr.length - 1 ? ' 0 6px 0' : ' 0 10px 0'}; font-size: 11px; color: ${footerTextColor}; font-weight: 500; line-height: 1.5; text-align: center;">${p.replace(/\n/g, '<br/>')}</p>`
      )
      .join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${canvasBg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: ${bodyColor};">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${canvasBg}; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: ${cardBg}; border-radius: 16px; overflow: hidden; border: 1px solid ${cardBorder};">
          <tr>
            <td style="padding: 28px 24px 20px 24px; text-align: center; border-bottom: 1px solid ${cardBorder};">
              <img src="https://pub-02eede7e093249b58dcbb8311443a76d.r2.dev/assets/email_logo.png" alt="Cloud Stack Club" width="52" height="52" style="display: block; width: 52px; height: 52px; object-fit: contain; margin: 0 auto 12px auto; border: 0;" />
              <div style="color: ${headerSubColor}; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">
                ${bannerSubtitle.includes('•') ? bannerSubtitle : `CLOUD STACK CLUB • ${bannerSubtitle}`}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 28px; text-align: left;">
              <h2 style="color: ${titleColor}; font-size: 22px; font-weight: 800; margin: 0 0 18px 0; letter-spacing: -0.3px; text-transform: uppercase;">${headline}</h2>
              ${paragraphs}
              ${detailBox}
              ${noticeInstHtml}
              ${ctaHtml}
            </td>
          </tr>
          <tr>
            <td style="background-color: #1f1f1f; border-top: 1px solid ${cardBorder}; padding: 22px 24px; text-align: center;">
              ${footerInstContent}
              <p style="margin: 0; font-size: 12px;"><a href="https://cloudstackclub.vercel.app" style="color: ${footerLinkColor}; text-decoration: none; font-weight: 600;">Visit Club Portal</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  // Theme & Banner Style
  const themeKey = template.banner_theme || 'classic_blue';
  const theme = BANNER_THEME_GRADIENTS[themeKey] || BANNER_THEME_GRADIENTS.classic_blue;
  const gradient = theme.gradient;
  const textAccent = theme.textAccent;
  const borderAccent = theme.borderAccent;
  const style = template.banner_style || 'modern_badge';
  const isDark = template.banner_text_color === 'dark';

  const titleColor = isDark ? '#0f172a' : '#ffffff';
  const subtextColor = isDark ? '#1e293b' : textAccent;
  const badgeBg = isDark ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.14)';
  const badgeBorder = isDark ? 'rgba(15, 23, 42, 0.25)' : 'rgba(255, 255, 255, 0.25)';
  const badgeText = isDark ? '#0f172a' : '#ffffff';
  const logoBg = isDark ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.2)';
  const logoBorder = isDark ? 'rgba(15, 23, 42, 0.25)' : 'rgba(255, 255, 255, 0.4)';
  const stripBg = isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.22)';
  const stripBorder = isDark ? 'rgba(15, 23, 42, 0.15)' : 'rgba(255, 255, 255, 0.12)';
  const stripText = isDark ? '#0f172a' : textAccent;

  let bannerHtml = '';
  if (style === 'modern_badge') {
    bannerHtml = `
      <tr>
        <td style="background: ${gradient}; padding: 36px 32px 30px 32px; text-align: center;">
          <div style="display: inline-block; width: 50px; height: 50px; padding: 2px; border-radius: 16px; background: ${logoBg}; border: 1.5px solid ${logoBorder}; text-align: center; margin-bottom: 12px; box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.25); box-sizing: border-box; vertical-align: middle;">
            <img src="https://pub-02eede7e093249b58dcbb8311443a76d.r2.dev/assets/email_logo.png" alt="Cloud Stack Club" width="44" height="44" style="display: block; width: 100%; height: 100%; object-fit: contain; margin: 0 auto; border: 0;" />
          </div>
          <h1 style="margin: 0; color: ${titleColor}; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">${bannerTitle}</h1>
          <div style="margin-top: 10px;">
            <span style="display: inline-block; background: ${badgeBg}; border: 1px solid ${badgeBorder}; padding: 4px 14px; border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 1.2px; color: ${badgeText}; text-transform: uppercase;">
              ${bannerSubtitle}
            </span>
          </div>
        </td>
      </tr>
    `;
  } else if (style === 'official_strip') {
    bannerHtml = `
      <tr>
        <td style="background: ${gradient}; padding: 0; text-align: center;">
          <div style="background: ${stripBg}; padding: 8px 16px; border-bottom: 1px solid ${stripBorder};">
            <span style="color: ${stripText}; font-size: 10px; font-weight: 800; letter-spacing: 1.8px; text-transform: uppercase;">
              Learn • Build • Deploy • Scale
            </span>
          </div>
          <div style="padding: 28px 32px 32px 32px;">
            <h1 style="margin: 0; color: ${titleColor}; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">${bannerTitle}</h1>
            <p style="margin: 6px 0 0 0; color: ${subtextColor}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">${bannerSubtitle}</p>
          </div>
        </td>
      </tr>
    `;
  } else if (style === 'floating_pill') {
    bannerHtml = `
      <tr>
        <td style="background: ${gradient}; padding: 34px 28px; text-align: center;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto; background: ${badgeBg}; border: 1px solid ${badgeBorder}; border-radius: 9999px; padding: 6px 20px; box-shadow: 0 8px 24px -4px rgba(0,0,0,0.2);">
            <tr>
              <td style="vertical-align: middle; padding-right: 12px;">
                <img src="https://pub-02eede7e093249b58dcbb8311443a76d.r2.dev/assets/email_logo.png" alt="CSC" width="34" height="34" style="display: block; width: 34px; height: 34px; object-fit: contain; margin: 0 auto; border: 0;" />
              </td>
              <td style="vertical-align: middle; text-align: left;">
                <span style="color: ${titleColor}; font-size: 15px; font-weight: 900; letter-spacing: 0.3px; display: block; line-height: 1.2;">${bannerTitle}</span>
                <span style="color: ${subtextColor}; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; display: block; margin-top: 2px;">${bannerSubtitle}</span>
              </td>
            </tr>
          </table>
          <div style="margin-top: 14px;">
            <span style="display: inline-block; background: ${stripBg}; border: 1px solid ${stripBorder}; padding: 3px 12px; border-radius: 12px; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; color: ${subtextColor}; text-transform: uppercase;">
              VERIFIED CLUB NOTIFICATION
            </span>
          </div>
        </td>
      </tr>
    `;
  } else if (style === 'tech_grid') {
    bannerHtml = `
      <tr>
        <td style="background: ${gradient}; padding: 28px 30px; text-align: left; position: relative;">
          <table width="100%" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="display: inline-block; font-family: monospace, Consolas, Courier; font-size: 10px; font-weight: 800; color: ${borderAccent}; background: ${stripBg}; border: 1px solid ${borderAccent}; padding: 3px 8px; border-radius: 4px; letter-spacing: 1px;">
                  [CSC::SYSTEM_SECURE]
                </span>
              </td>
              <td style="text-align: right;">
                <span style="color: ${subtextColor}; font-size: 10px; font-weight: 700; font-family: monospace; letter-spacing: 1px;">
                  ● LIVE NOTIFICATION
                </span>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top: 14px;">
                <h1 style="margin: 0; color: ${titleColor}; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  ${bannerTitle}
                </h1>
                <p style="margin: 4px 0 0 0; color: ${subtextColor}; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; font-family: monospace;">
                  // ${bannerSubtitle}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  } else if (style === 'executive_crest') {
    bannerHtml = `
      <tr>
        <td style="background: ${gradient}; padding: 36px 32px 30px 32px; text-align: center;">
          <img src="https://pub-02eede7e093249b58dcbb8311443a76d.r2.dev/assets/email_logo.png" alt="Cloud Stack Club" width="52" height="52" style="display: block; width: 52px; height: 52px; object-fit: contain; margin: 0 auto 10px auto; border: 0;" />
          <div style="font-size: 11px; letter-spacing: 3px; color: ${subtextColor}; text-transform: uppercase; font-weight: 800; margin-bottom: 8px;">
            ─── ❖ OFFICIAL DISPATCH ❖ ───
          </div>
          <h1 style="margin: 0; color: ${titleColor}; font-size: 24px; font-weight: 900; letter-spacing: 0.5px;">
            ${bannerTitle}
          </h1>
          <p style="margin: 8px 0 0 0; color: ${subtextColor}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.8px;">
            ${bannerSubtitle}
          </p>
        </td>
      </tr>
    `;
  } else if (style === 'split_hero') {
    bannerHtml = `
      <tr>
        <td style="background: ${gradient}; padding: 28px 30px;">
          <table width="100%" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align: middle; width: 48px; padding-right: 14px;">
                <div style="width: 46px; height: 46px; border-radius: 14px; background: ${logoBg}; border: 1.5px solid ${logoBorder}; text-align: center; padding: 2px; box-sizing: border-box;">
                  <img src="https://pub-02eede7e093249b58dcbb8311443a76d.r2.dev/assets/email_logo.png" alt="Cloud Stack Club" width="40" height="40" style="display: block; width: 100%; height: 100%; object-fit: contain; margin: 0 auto; border: 0;" />
                </div>
              </td>
              <td style="vertical-align: middle; text-align: left;">
                <h1 style="margin: 0; color: ${titleColor}; font-size: 20px; font-weight: 900; letter-spacing: -0.3px; line-height: 1.2;">
                  ${bannerTitle}
                </h1>
                <p style="margin: 3px 0 0 0; color: ${subtextColor}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px;">
                  ${bannerSubtitle}
                </p>
              </td>
              <td style="vertical-align: middle; text-align: right;">
                <span style="display: inline-block; background: ${badgeBg}; border: 1px solid ${badgeBorder}; padding: 4px 10px; border-radius: 9999px; font-size: 10px; font-weight: 800; letter-spacing: 1px; color: ${badgeText}; text-transform: uppercase;">
                  🏛️ OFFICIAL
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  } else if (style === 'compact_bar') {
    bannerHtml = `
      <tr>
        <td style="background: ${gradient}; padding: 16px 26px; border-bottom: 3px solid ${borderAccent};">
          <table width="100%" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align: middle; text-align: left;">
                <table border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align: middle; padding-right: 8px;">
                      <img src="https://pub-02eede7e093249b58dcbb8311443a76d.r2.dev/assets/email_logo.png" alt="CSC" width="20" height="20" style="display: block; width: 20px; height: 20px; object-fit: contain; border: 0;" />
                    </td>
                    <td style="vertical-align: middle;">
                      <span style="color: ${titleColor}; font-size: 15px; font-weight: 900; letter-spacing: -0.3px;">
                        ${bannerTitle}
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
              <td style="vertical-align: middle; text-align: right;">
                <span style="color: ${subtextColor}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px;">
                  ${bannerSubtitle}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  } else if (style === 'minimal') {
    bannerHtml = `
      <tr>
        <td style="background: ${gradient}; padding: 32px 32px; text-align: center;">
          <div style="width: 32px; height: 3px; background: ${borderAccent}; border-radius: 2px; margin: 0 auto 12px auto;"></div>
          <h1 style="margin: 0; color: ${titleColor}; font-size: 22px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase;">${bannerTitle}</h1>
          <p style="margin: 6px 0 0 0; color: ${subtextColor}; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">${bannerSubtitle}</p>
        </td>
      </tr>
    `;
  } else {
    // Classic
    bannerHtml = `
      <tr>
        <td style="background: ${gradient}; padding: 36px 32px; text-align: center;">
          <h1 style="margin: 0; color: ${titleColor}; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">${bannerTitle}</h1>
          <p style="margin: 6px 0 0 0; color: ${subtextColor}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">${bannerSubtitle}</p>
        </td>
      </tr>
    `;
  }

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
        <p style="margin: 4px 0; font-size: 14px; color: #1e293b;"><strong>Member ID:</strong> ${data.member_id || 'CSC-26-4892'}</p>
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
    const formattedDate = formatEventDate(data.event_date);
    const formattedTime = formatEventTime(data.event_time);
    categoryDetailBox = `
      <div style="background-color: #f1f5f9; border-radius: 16px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Event Logistics</p>
        ${formattedDate ? `<p style="margin: 4px 0; font-size: 14px; color: #1e293b;"><strong>Date:</strong> ${formattedDate}</p>` : ''}
        ${formattedTime ? `<p style="margin: 4px 0; font-size: 14px; color: #1e293b;"><strong>Time:</strong> ${formattedTime}</p>` : ''}
        ${data.event_venue ? `<p style="margin: 4px 0; font-size: 14px; color: #1e293b;"><strong>Venue:</strong> ${data.event_venue}</p>` : ''}
      </div>
    `;
  } else if (template.category === 'event_registration_individual') {
    const formattedDate = formatEventDate(data.event_date);
    const formattedTime = formatEventTime(data.event_time);
    const deptYear = [data.department, data.year].filter(Boolean).join(' - ');
    const participantDisplay = deptYear ? `${data.name || 'Participant'} (${deptYear})` : (data.name || 'Participant');

    categoryDetailBox = `
      <div style="background-color: #f1f5f9; border-radius: 16px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 12px 0; font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Registration & Event Details</p>
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #1e293b; line-height: 1.8;">
          <tr>
            <td style="padding: 3px 0; width: 140px; color: #64748b;"><strong>Event:</strong></td>
            <td style="padding: 3px 0; font-weight: 700; color: #1e293b;">${data.event_title || ''}</td>
          </tr>
          ${formattedDate ? `
          <tr>
            <td style="padding: 3px 0; color: #64748b;"><strong>Date:</strong></td>
            <td style="padding: 3px 0;">${formattedDate}</td>
          </tr>` : ''}
          ${formattedTime ? `
          <tr>
            <td style="padding: 3px 0; color: #64748b;"><strong>Time:</strong></td>
            <td style="padding: 3px 0;">${formattedTime}</td>
          </tr>` : ''}
          ${data.event_venue ? `
          <tr>
            <td style="padding: 3px 0; color: #64748b;"><strong>Venue:</strong></td>
            <td style="padding: 3px 0;">${data.event_venue}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 3px 0; color: #64748b;"><strong>Participant:</strong></td>
            <td style="padding: 3px 0; font-weight: 600;">${participantDisplay}</td>
          </tr>
          ${data.uid ? `
          <tr>
            <td style="padding: 3px 0; color: #64748b;"><strong>University ID:</strong></td>
            <td style="padding: 3px 0; font-family: monospace; font-weight: 700; color: #2563eb;">${data.uid}</td>
          </tr>` : ''}
          ${data.registration_number ? `
          <tr>
            <td style="padding: 3px 0; color: #64748b;"><strong>Registration ID:</strong></td>
            <td style="padding: 3px 0; font-family: monospace; font-weight: 700; color: #1e293b;">${data.registration_number}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 3px 0; color: #64748b;"><strong>Entry Pass:</strong></td>
            <td style="padding: 3px 0;"><span style="display: inline-block; background-color: #dcfce7; color: #15803d; font-weight: 800; font-size: 11px; padding: 2px 10px; border-radius: 9999px; border: 1px solid #86efac;">CONFIRMED</span></td>
          </tr>
        </table>
      </div>
    `;
  } else if (template.category === 'event_registration_team_leader') {
    const formattedDate = formatEventDate(data.event_date);
    const formattedTime = formatEventTime(data.event_time);
    const leaderDeptYear = [data.department || data.leader_department, data.year || data.leader_year].filter(Boolean).join(' - ');
    const leaderDisplay = leaderDeptYear ? `${data.name || data.leader_name || 'Team Leader'} (${leaderDeptYear})` : (data.name || data.leader_name || 'Team Leader');
    const leaderUid = data.uid || data.leader_uid || '';
    const leaderRegId = data.leader_registration_number || data.leader_pass_id || '';
    const teamRegId = data.team_registration_number || data.registration_number || '';

    const membersList: Array<{ name: string; department?: string; year?: string; uid?: string; registration_number?: string }> =
      data.team_members && Array.isArray(data.team_members) && data.team_members.length > 0
        ? data.team_members
        : [
            { name: 'Riya Patel', department: 'Computer Science & Engineering', year: '3rd Year', uid: '22BCS10892', registration_number: 'REG-26-8892' },
            { name: 'Karan Singh', department: 'Information Technology', year: '3rd Year', uid: '22BCS10915', registration_number: 'REG-26-8893' },
          ];

    const membersHtml = membersList
      .map((m) => {
        const mDeptYear = [m.department, m.year].filter(Boolean).join(' - ');
        return `
          <li style="margin: 6px 0; color: #334155;">
            <span><strong>${m.name}</strong>${mDeptYear ? ` (${mDeptYear})` : ''}</span>
            ${m.registration_number ? `<span style="display: block; font-family: monospace; font-size: 12px; color: #334155; margin-top: 2px;">Registration ID: <strong>${m.registration_number}</strong></span>` : ''}
            ${m.uid ? `<span style="display: block; font-family: monospace; font-size: 12px; color: #64748b; margin-top: 2px;">UID: <strong>${m.uid}</strong></span>` : ''}
          </li>
        `;
      })
      .join('');

    categoryDetailBox = `
      <div style="background-color: #f1f5f9; border-radius: 16px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 12px 0; font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Team Registration Summary</p>
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #1e293b; line-height: 1.8;">
          <tr>
            <td style="padding: 3px 0; width: 140px; color: #64748b;"><strong>Event:</strong></td>
            <td style="padding: 3px 0; font-weight: 700; color: #1e293b;">${data.event_title || ''}</td>
          </tr>
          ${formattedDate ? `
          <tr>
            <td style="padding: 3px 0; color: #64748b;"><strong>Date:</strong></td>
            <td style="padding: 3px 0;">${formattedDate}</td>
          </tr>` : ''}
          ${formattedTime ? `
          <tr>
            <td style="padding: 3px 0; color: #64748b;"><strong>Time:</strong></td>
            <td style="padding: 3px 0;">${formattedTime}</td>
          </tr>` : ''}
          ${data.event_venue ? `
          <tr>
            <td style="padding: 3px 0; color: #64748b;"><strong>Venue:</strong></td>
            <td style="padding: 3px 0;">${data.event_venue}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 3px 0; color: #64748b;"><strong>Team Name:</strong></td>
            <td style="padding: 3px 0; font-weight: 800; color: #1e293b; font-size: 15px;">${data.team_name || ''}</td>
          </tr>
          ${teamRegId ? `
          <tr>
            <td style="padding: 3px 0; color: #64748b;"><strong>Team Reg ID:</strong></td>
            <td style="padding: 3px 0; font-family: monospace; font-weight: 700; color: #1e293b;">${teamRegId}</td>
          </tr>` : ''}
        </table>

        <div style="margin-top: 16px; padding: 14px; background-color: #ffffff; border-radius: 12px; border: 1px solid #cbd5e1;">
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #4338ca; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Team Leader</p>
          <p style="margin: 0; font-size: 14px; font-weight: 700; color: #1e293b;">${leaderDisplay}</p>
          ${leaderUid ? `<p style="margin: 4px 0 0 0; font-size: 13px; font-family: monospace; color: #334155;">UID: <strong>${leaderUid}</strong></p>` : ''}
          ${leaderRegId ? `<p style="margin: 4px 0 0 0; font-size: 13px; font-family: monospace; color: #334155;">Registration ID: <strong>${leaderRegId}</strong></p>` : ''}
        </div>

        ${membersList.length > 0 ? `
        <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed #cbd5e1;">
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase;">Registered Teammates (${membersList.length})</p>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8;">
            ${membersHtml}
          </ul>
        </div>` : ''}
      </div>
    `;
  } else if (template.category === 'event_registration_team_member') {
    const formattedDate = formatEventDate(data.event_date);
    const formattedTime = formatEventTime(data.event_time);
    const leaderDeptYear = [data.leader_department, data.leader_year].filter(Boolean).join(' - ');
    const leaderDisplay = leaderDeptYear ? `${data.leader_name || 'Team Leader'} (${leaderDeptYear})` : (data.leader_name || 'Team Leader');
    const leaderUid = data.leader_uid || '';
    const leaderRegId = data.leader_registration_number || '';
    const teamRegId = data.team_registration_number || data.registration_number || '';
    const memberRegId = data.member_registration_number || '';

    const otherMembersList: Array<{ name: string; department?: string; year?: string; registration_number?: string }> =
      data.other_members && Array.isArray(data.other_members) && data.other_members.length > 0
        ? data.other_members
        : (data.team_members && Array.isArray(data.team_members) && data.team_members.length > 0)
        ? data.team_members
        : [
            { name: 'Karan Singh', department: 'Information Technology', year: '3rd Year' },
            { name: 'Sneha Roy', department: 'Computer Science & Engineering', year: '3rd Year' },
          ];

    const otherMembersHtml = otherMembersList
      .map((m) => {
        const mDeptYear = [m.department, m.year].filter(Boolean).join(' - ');
        return `
          <li style="margin: 4px 0; color: #334155;">
            <strong>${m.name}</strong>${mDeptYear ? ` (${mDeptYear})` : ''}
          </li>
        `;
      })
      .join('');

    categoryDetailBox = `
      <div style="background-color: #f1f5f9; border-radius: 16px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 12px 0; font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Team Registration Details</p>
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #1e293b; line-height: 1.8;">
          <tr>
            <td style="padding: 3px 0; width: 140px; color: #64748b;"><strong>Event:</strong></td>
            <td style="padding: 3px 0; font-weight: 700; color: #1e293b;">${data.event_title || ''}</td>
          </tr>
          ${formattedDate ? `
          <tr>
            <td style="padding: 3px 0; color: #64748b;"><strong>Date:</strong></td>
            <td style="padding: 3px 0;">${formattedDate}</td>
          </tr>` : ''}
          ${formattedTime ? `
          <tr>
            <td style="padding: 3px 0; color: #64748b;"><strong>Time:</strong></td>
            <td style="padding: 3px 0;">${formattedTime}</td>
          </tr>` : ''}
          ${data.event_venue ? `
          <tr>
            <td style="padding: 3px 0; color: #64748b;"><strong>Venue:</strong></td>
            <td style="padding: 3px 0;">${data.event_venue}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 3px 0; color: #64748b;"><strong>Your Team:</strong></td>
            <td style="padding: 3px 0; font-weight: 800; color: #1e293b; font-size: 15px;">${data.team_name || ''}</td>
          </tr>
          ${teamRegId ? `
          <tr>
            <td style="padding: 3px 0; color: #64748b;"><strong>Team Reg ID:</strong></td>
            <td style="padding: 3px 0; font-family: monospace; font-weight: 700; color: #1e293b;">${teamRegId}</td>
          </tr>` : ''}
          ${memberRegId ? `
          <tr>
            <td style="padding: 3px 0; color: #64748b;"><strong>Your Reg ID:</strong></td>
            <td style="padding: 3px 0; font-family: monospace; font-weight: 700; color: #1e293b;">${memberRegId}</td>
          </tr>` : ''}
        </table>

        <!-- Team Leader Box: Name (Department - year) \n UID: <uid> -->
        <div style="margin-top: 16px; padding: 14px; background-color: #ffffff; border-radius: 12px; border: 1px solid #cbd5e1;">
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #4338ca; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Team Leader</p>
          <p style="margin: 0; font-size: 14px; font-weight: 700; color: #1e293b;">${leaderDisplay}</p>
          ${leaderUid ? `<p style="margin: 4px 0 0 0; font-size: 13px; font-family: monospace; color: #334155;">UID: <strong>${leaderUid}</strong></p>` : ''}
          ${leaderRegId ? `<p style="margin: 4px 0 0 0; font-size: 13px; font-family: monospace; color: #334155;">Registration ID: <strong>${leaderRegId}</strong></p>` : ''}
          ${data.leader_email ? `<p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">Email: ${data.leader_email}</p>` : ''}
        </div>

        <!-- Other Team Members: name department and year -->
        ${otherMembersList.length > 0 ? `
        <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed #cbd5e1;">
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase;">Other Team Members</p>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8;">
            ${otherMembersHtml}
          </ul>
        </div>` : ''}
      </div>
    `;
  }

  const buttonGradient = theme.buttonGradient;
  const buttonTextColor = theme.buttonTextColor;
  const buttonShadow = theme.buttonShadow;

  // Optional Notice Callout Box for Standard Format
  let noticeStdHtml = '';
  if (rawNotice && rawNotice.trim()) {
    const noticeParagraphs = rawNotice
      .split(/\n\n+/)
      .map((p) => `<p style="margin: 0 0 8px 0; line-height: 1.5;">${p.replace(/\n/g, '<br/>')}</p>`)
      .join('')
      .replace(/<p style="margin: 0 0 8px 0; line-height: 1.5;">(.*?)<\/p>$/, '<p style="margin: 0; line-height: 1.5;">$1</p>');

    noticeStdHtml = `
      <div style="background-color: #f8fafc; border-left: 4px solid ${borderAccent}; border-radius: 12px; padding: 14px 18px; margin: 20px 0; color: #334155; font-size: 13.5px; font-weight: 500; line-height: 1.5; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
        ${noticeParagraphs}
      </div>
    `;
  }

  // Action Button
  const buttonHtml = buttonText
    ? `
      <div style="margin-top: 32px; text-align: center;">
        <a href="${buttonUrl}" target="_blank" rel="noopener noreferrer" style="background: ${buttonGradient}; color: ${buttonTextColor}; text-decoration: none; padding: 14px 28px; border-radius: 14px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 10px 20px -5px ${buttonShadow};">
          ${buttonText}
        </a>
      </div>
    `
    : '';

  // Format footer paragraphs & line breaks (centered)
  const footerContent = (footer || '')
    .split(/\n\n+/)
    .map(
      (p, idx, arr) =>
        `<p style="margin: 0${idx < arr.length - 1 ? ' 0 8px 0' : ''}; font-size: 12px; color: #64748b; font-weight: 500; line-height: 1.6; text-align: center;">${p.replace(/\n/g, '<br/>')}</p>`
    )
    .join('');

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
            ${bannerHtml}
            <!-- Content Area -->
            <tr>
              <td style="padding: 36px 32px;">
                <h2 style="color: #1e293b; font-size: 20px; font-weight: 800; margin-top: 0; margin-bottom: 16px;">${headline}</h2>
                ${paragraphs}
                ${categoryDetailBox}
                ${noticeStdHtml}
                ${buttonHtml}
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 32px; text-align: center;">
                ${footerContent}
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
