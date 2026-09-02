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
 * Checks if feedback is currently open for an event (during live event or T+1 feedback window)
 */
export const isFeedbackActive = (evt?: any): boolean => {
  if (!evt || !evt.date) return false;
  if (evt.status === 'live') return true;
  try {
    const today = new Date();
    const cleanDate = evt.date.split('T')[0];
    const [ey, em, ed] = cleanDate.split('-').map(Number);
    if (!ey || !em || !ed) return false;
    const dEvent = new Date(ey, em - 1, ed);
    const dToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffTime = dEvent.getTime() - dToday.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 0 || diffDays === -1;
  } catch {
    return false;
  }
};

export interface EventStatusInfo {
  label: string;
  type: 'ongoing' | 'upcoming' | 'completed';
}

export const getEventStatusInfo = (dateStr?: string | null): EventStatusInfo => {
  if (!dateStr) return { label: 'Upcoming Event', type: 'upcoming' };
  try {
    const today = new Date();
    const todayYMD = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const eventDate = new Date(dateStr);
    const eventYMD = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;

    if (eventYMD === todayYMD) {
      return { label: 'Ongoing Event', type: 'ongoing' };
    }
    
    const dToday = new Date(todayYMD);
    const dEvent = new Date(eventYMD);

    if (dEvent < dToday) {
      return { label: 'Completed Event', type: 'completed' };
    }
    return { label: 'Upcoming Event', type: 'upcoming' };
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
