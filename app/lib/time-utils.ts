// Utilities for flexible time parsing (supporting both colon ":" and dot "." separators)
// and parsing combined time ranges like "08.30 - 10.00"

// Parse any time string ("08:30", "08.30", "8.30", "8", "17.45", "17:45") to minutes from midnight
export function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const clean = timeStr.trim().toLowerCase();
  if (!clean) return null;

  let h = 0;
  let m = 0;

  if (clean.includes(':')) {
    const parts = clean.split(':');
    h = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10);
  } else if (clean.includes('.')) {
    const parts = clean.split('.');
    h = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10);
  } else if (/^\d+$/.test(clean)) {
    h = parseInt(clean, 10);
    m = 0;
  } else {
    return null;
  }

  if (isNaN(h)) return null;
  if (isNaN(m)) m = 0;

  // Clamp hours & minutes
  h = Math.max(0, Math.min(23, h));
  m = Math.max(0, Math.min(59, m));

  return h * 60 + m;
}

// Convert minutes from midnight to normalized "HH:mm" string
export function minutesToTimeString(mins: number): string {
  const norm = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Format duration minutes to "H:MM" (e.g. 90 -> "1:30", 60 -> "1:00", 15 -> "0:15")
export function formatDurationFromMinutes(mins: number): string {
  const norm = Math.max(0, mins);
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}

// Parse duration string ("1:30", "1.30", "1.5", "90", "2h", "1h 30m") to minutes
export function parseDurationInputToMinutes(val?: string): number {
  if (!val) return 0;
  const trimmed = val.trim().toLowerCase();
  if (!trimmed) return 0;

  if (trimmed.includes(':')) {
    const [h, m] = trimmed.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) return h * 60 + m;
  }

  if (trimmed.includes('.')) {
    const parts = trimmed.split('.');
    if (parts.length === 2) {
      const h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      // If user typed "1.30" meaning 1 hour 30 mins
      if (m > 0 && m < 60 && parts[1].length <= 2) {
        return h * 60 + m;
      }
      // If decimal "1.5" -> 90 mins
      const num = parseFloat(trimmed);
      if (!isNaN(num)) return Math.round(num * 60);
    }
  }

  const num = parseFloat(trimmed);
  if (!isNaN(num)) {
    if (num >= 60) return Math.round(num);
    return Math.round(num * 60);
  }

  return 0;
}

// Parse combined range string like "08.30 - 10.00", "08:30-10:00", "8 - 11.30", "09.00 to 12.00", "08.00 s/d 10.00"
export function parseTimeRangeString(rangeStr?: string): {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  durationString: string;
} | null {
  if (!rangeStr) return null;
  const clean = rangeStr.trim();
  if (!clean) return null;

  // Split by "-", "to", "s/d", "sampai", "~"
  const delimiterRegex = /\s*(?:-|to|s\/d|sampai|~)\s*/i;
  const parts = clean.split(delimiterRegex);

  if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
    const startMins = parseTimeToMinutes(parts[0]);
    const endMins = parseTimeToMinutes(parts[1]);

    if (startMins !== null && endMins !== null) {
      let diff = endMins - startMins;
      if (diff <= 0) diff += 1440; // handle wrap around

      const startTime = minutesToTimeString(startMins);
      const endTime = minutesToTimeString(endMins);
      const durationMinutes = diff;
      const durationString = formatDurationFromMinutes(diff);

      return { startTime, endTime, durationMinutes, durationString };
    }
  }

  return null;
}
