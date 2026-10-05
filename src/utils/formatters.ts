/**
 * Formats a person's name into clean Title Case (e.g. "utkrisht utpal" -> "Utkrisht Utpal")
 * Collapses multiple spaces and capitalizes the first letter of each word.
 */
export const formatPersonName = (name?: string | null): string => {
  if (!name) return '';
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  return trimmed
    .toLowerCase()
    .replace(/(?:^|[\s\-\'])([a-z\u00C0-\u024F])/g, (match) => match.toUpperCase());
};

/**
 * Formats a time string (e.g. "10:00:00" or "14:30") into a clean 12-hour format: "HH:MM AM/PM"
 */
export const formatEventTime = (timeStr?: string | null): string => {
  if (!timeStr) return '';

  const trimmed = timeStr.trim();
  if (!trimmed) return '';

  // If already formatted with AM/PM
  if (/[a-z]/i.test(trimmed)) return trimmed;

  const parts = trimmed.split(':');
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];

    if (isNaN(hours)) return trimmed;

    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;

    const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
    return `${formattedHours}:${minutes} ${ampm}`;
  }

  return trimmed;
};

/**
 * Formats a date string (YYYY-MM-DD) into readable format: "Sep 15, 2026"
 */
export const formatEventDate = (dateStr?: string | null): string => {
  if (!dateStr) return 'Date TBA';
  try {
    const clean = dateStr.split('T')[0];
    const [year, month, day] = clean.split('-').map(Number);
    if (!year || !month || !day) return dateStr;
    const dateObj = new Date(year, month - 1, day);
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

/**
 * Combines date string (YYYY-MM-DD) and optional time string (e.g. "14:30" or "02:30 PM")
 * into a local Date object. If time is omitted or invalid, defaults to start of day (00:00:00).
 */
export const getEventStartDateTime = (dateStr?: string | null, timeStr?: string | null): Date | null => {
  if (!dateStr) return null;
  const cleanDate = dateStr.split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length < 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;

  let hours = 0;
  let minutes = 0;

  if (timeStr && timeStr.trim()) {
    const trimmed = timeStr.trim();
    const isPM = /pm/i.test(trimmed);
    const isAM = /am/i.test(trimmed);
    const numericPart = trimmed.replace(/[^\d:]/g, '');
    const timeParts = numericPart.split(':');
    if (timeParts.length >= 1) {
      let h = parseInt(timeParts[0], 10);
      let min = timeParts.length >= 2 ? parseInt(timeParts[1], 10) : 0;
      if (!isNaN(h)) {
        if (isPM && h < 12) h += 12;
        if (isAM && h === 12) h = 0;
        hours = h;
      }
      if (!isNaN(min)) {
        minutes = min;
      }
    }
  }

  return new Date(y, m - 1, d, hours, minutes, 0, 0);
};

/**
 * Checks if feedback is currently open for an event (during live event or T+1 feedback window)
 * Evaluates both the exact Date AND Time.
 */
export const isFeedbackActive = (evt?: any): boolean => {
  if (!evt || !evt.date) return false;
  if (evt.status === 'cancelled' || evt.status === 'inactive') return false;
  if (evt.status === 'live') return true;

  try {
    const now = new Date();
    const cleanDate = evt.date.split('T')[0];
    const [ey, em, ed] = cleanDate.split('-').map(Number);
    if (!ey || !em || !ed) return false;

    // Feedback window ends at the end of Day T+1 (23:59:59.999 of the day following event)
    const endOfTPlusOne = new Date(ey, em - 1, ed + 2, 0, 0, 0, 0).getTime();

    // Start time of the event
    const startDateTime = getEventStartDateTime(evt.date, evt.start_time);
    if (!startDateTime) return false;

    const startTimeMs = startDateTime.getTime();
    const nowMs = now.getTime();

    // If event is explicitly marked completed, active as long as within T+1 window
    if (evt.status === 'completed') {
      return nowMs < endOfTPlusOne;
    }

    // Feedback opens when the event's scheduled start time arrives, and stays open until T+1 window ends
    return nowMs >= startTimeMs && nowMs < endOfTPlusOne;
  } catch {
    return false;
  }
};

export interface EventStatusInfo {
  label: string;
  type: 'ongoing' | 'upcoming' | 'completed';
}

export const getEventStatusInfo = (dateStr?: string | null, timeStr?: string | null): EventStatusInfo => {
  if (!dateStr) return { label: 'Upcoming Event', type: 'upcoming' };
  try {
    const now = new Date();
    const startDateTime = getEventStartDateTime(dateStr, timeStr);
    if (!startDateTime) return { label: 'Upcoming Event', type: 'upcoming' };

    const cleanDate = dateStr.split('T')[0];
    const [ey, em, ed] = cleanDate.split('-').map(Number);
    if (!ey || !em || !ed) return { label: 'Upcoming Event', type: 'upcoming' };

    const endOfDay = new Date(ey, em - 1, ed, 23, 59, 59, 999).getTime();
    const nowMs = now.getTime();
    const startMs = startDateTime.getTime();

    // If current time is before event's scheduled date & time
    if (nowMs < startMs) {
      return { label: 'Upcoming Event', type: 'upcoming' };
    }

    // If event has started and it is still event day
    if (nowMs >= startMs && nowMs <= endOfDay) {
      return { label: 'Ongoing Event', type: 'ongoing' };
    }

    // Beyond event day
    return { label: 'Completed Event', type: 'completed' };
  } catch {
    return { label: 'Upcoming Event', type: 'upcoming' };
  }
};

export const isRegistrationFull = (evt?: any, currentCount?: number): boolean => {
  if (!evt || !evt.max_registrations || typeof currentCount !== 'number') return false;
  return currentCount >= evt.max_registrations;
};

export const isRegistrationActive = (evt?: any, currentCount?: number): boolean => {
  if (!evt) return false;
  if (!evt.registration_enabled) return false;

  // If maximum registration capacity has been reached
  if (evt.max_registrations && typeof currentCount === 'number' && currentCount >= evt.max_registrations) {
    return false;
  }

  const now = new Date();

  // If registration start is set and in future
  if (evt.registration_start) {
    const startStr = typeof evt.registration_start === 'string' ? evt.registration_start.split('T')[0] : '';
    const [sy, sm, sd] = startStr.split('-').map(Number);
    const startDate = (sy && sm && sd)
      ? new Date(sy, sm - 1, sd, 0, 0, 0, 0)
      : new Date(evt.registration_start);

    if (startDate > now) return false;
  }

  // If registration end date has passed (active throughout the entire end day until 23:59:59.999)
  if (evt.registration_end) {
    const endStr = typeof evt.registration_end === 'string' ? evt.registration_end.split('T')[0] : '';
    const [ey, em, ed] = endStr.split('-').map(Number);
    const endDate = (ey && em && ed)
      ? new Date(ey, em - 1, ed, 23, 59, 59, 999)
      : new Date(evt.registration_end);

    if (endDate < now) return false;
  }

  return true;
};

/**
 * Normalizes any LinkedIn input (handle, in/handle, full URL) into a standard https:// URL
 */
export const formatLinkedInUrl = (raw?: string | null): string => {
  if (!raw) return '';
  let str = raw.trim();
  if (!str) return '';
  if (str.startsWith('http://') || str.startsWith('https://')) {
    return str;
  }
  if (str.startsWith('linkedin.com') || str.startsWith('www.linkedin.com')) {
    return `https://${str}`;
  }
  if (str.startsWith('in/')) {
    return `https://www.linkedin.com/${str}`;
  }
  if (str.startsWith('@')) {
    return `https://www.linkedin.com/in/${str.substring(1)}`;
  }
  return `https://www.linkedin.com/in/${str}`;
};

/**
 * Extracts a neat, human-readable handle to display in UI (e.g. "in/username")
 */
export const formatLinkedInDisplay = (raw?: string | null): string => {
  if (!raw) return '';
  let str = raw.trim();
  if (!str) return '';
  try {
    if (str.startsWith('http://') || str.startsWith('https://')) {
      const url = new URL(str);
      const path = url.pathname.replace(/\/+$/, '').replace(/^\/+/, '');
      return path ? (path.startsWith('in/') ? path : `in/${path}`) : 'LinkedIn Profile';
    }
  } catch {}
  if (str.startsWith('linkedin.com/') || str.startsWith('www.linkedin.com/')) {
    const after = str.replace(/^(?:www\.)?linkedin\.com\//, '').replace(/\/+$/, '');
    return after ? (after.startsWith('in/') ? after : `in/${after}`) : 'LinkedIn Profile';
  }
  if (str.startsWith('in/')) {
    return str.replace(/\/+$/, '');
  }
  if (str.startsWith('@')) {
    return `in/${str.substring(1)}`;
  }
  return `in/${str}`;
};

/**
 * Formats a student's Chandigarh University UID into an official institutional email (e.g. "24BCF10063" -> "24BCF10063@cuchd.in")
 */
export const formatOfficialEmail = (uid?: string | null): string => {
  if (!uid) return '';
  const trimmed = String(uid).trim();
  if (!trimmed || trimmed.toLowerCase() === 'n/a') return '';
  if (trimmed.includes('@')) return trimmed;
  return `${trimmed}@cuchd.in`;
};

