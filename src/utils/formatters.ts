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
