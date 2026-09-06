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
 * Formats time or time range into 12-hour format with AM/PM
 */
export function formatEventTime(timeStr?: string): string {
  if (!timeStr) return '';
  try {
    if (timeStr.includes(' - ')) {
      return timeStr.split(' - ').map(formatSingleTime).join(' - ');
    }
    if (timeStr.includes(' to ')) {
      return timeStr.split(' to ').map(formatSingleTime).join(' to ');
    }
    return formatSingleTime(timeStr);
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
          banner_style: template.banner_style || 'modern_badge',
          banner_theme: template.banner_theme || 'classic_blue',
          banner_text_color: template.banner_text_color || 'white',
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
  const categories: EmailCategory[] = ['approval', 'rejection', 'contact_us', 'event_feedback', 'event_broadcast'];
  return applyBannerDesignToCategories(categories, style, theme, textColor);
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
              🎓 ${bannerSubtitle}
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
              ✨ VERIFIED CLUB NOTIFICATION
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
    const formattedDate = formatEventDate(data.event_date) || 'Tuesday, September 15, 2026';
    const formattedTime = formatEventTime(data.event_time) || '10:00 AM - 04:00 PM';
    categoryDetailBox = `
      <div style="background-color: #f1f5f9; border-radius: 16px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Event Logistics</p>
        <p style="margin: 4px 0; font-size: 14px; color: #1e293b;">📅 <strong>Date:</strong> ${formattedDate}</p>
        ${formattedTime ? `<p style="margin: 4px 0; font-size: 14px; color: #1e293b;">⏰ <strong>Time:</strong> ${formattedTime}</p>` : ''}
        <p style="margin: 4px 0; font-size: 14px; color: #1e293b;">📍 <strong>Venue:</strong> ${data.event_venue || 'Block B, Audi 3, Chandigarh University'}</p>
      </div>
    `;
  }

  const buttonGradient = theme.buttonGradient;
  const buttonTextColor = theme.buttonTextColor;
  const buttonShadow = theme.buttonShadow;

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
