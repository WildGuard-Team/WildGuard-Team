const clockToleranceMs = 5 * 60 * 1000;

// datetime-local represents the member's local wall time; the API receives UTC ISO.
export function parseIncidentDateTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const [year, month, day, hour, minute] = value.split(/[-T:]/).map(Number);
  const date = new Date(value);
  if (year < 1 || !Number.isFinite(date.getTime()) || date.getFullYear() !== year
    || date.getMonth() + 1 !== month || date.getDate() !== day
    || date.getHours() !== hour || date.getMinutes() !== minute) return null;
  return date;
}

export function validateIncidentDateTime(value, now = Date.now()) {
  if (value === undefined || value === null || value === '') return 'Incident date and time is required.';
  const date = parseIncidentDateTime(value);
  if (!date) return 'Enter a valid incident date and time.';
  if (date.getTime() > now + clockToleranceMs) return 'Incident date and time cannot be in the future.';
  return '';
}

export function defaultIncidentDateTime() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${String(date.getFullYear()).padStart(4, '0')}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
