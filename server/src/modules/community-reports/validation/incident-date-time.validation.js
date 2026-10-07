import { HttpError } from '../../../shared/http-error.js';

const clockToleranceMs = 5 * 60 * 1000;

export function validateIncidentDateTime(value, now = Date.now()) {
  if (value === undefined || value === null || value === '') {
    throw new HttpError(400, 'Incident date and time is required.');
  }
  // Require a timezone-qualified ISO instant and reject calendar rollover (e.g. February 30).
  const parts = typeof value === 'string'
    ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(value) : null;
  if (!parts) throw new HttpError(400, 'Enter a valid incident date and time.');
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, zone] = parts;
  const [year, month, day, hour, minute, second] = [yearText, monthText, dayText, hourText, minuteText, secondText].map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const invalidZone = zone !== 'Z' && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4)) > 59);
  const date = new Date(value);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]
    || hour > 23 || minute > 59 || second > 59 || invalidZone || !Number.isFinite(date.getTime())) {
    throw new HttpError(400, 'Enter a valid incident date and time.');
  }
  if (date.getTime() > now + clockToleranceMs) {
    throw new HttpError(400, 'Incident date and time cannot be in the future.');
  }
  return date;
}
