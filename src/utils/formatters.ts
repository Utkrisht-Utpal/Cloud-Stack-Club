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

export const isRegistrationActive = (evt?: any): boolean => {
  if (!evt) return false;
  if (!evt.registration_enabled) return false;

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
