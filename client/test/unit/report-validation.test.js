import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultIncidentDateTime, parseIncidentDateTime, validateIncidentDateTime } from '../../src/features/community-reports/validation/incidentDateTime.validation.js';
import { validateReportDetails } from '../../src/features/community-reports/validation/reportDetails.validation.js';
import { evidenceFileKey, formatFileSize, validateEvidenceSelection } from '../../src/features/community-reports/validation/evidence.validation.js';
import { getReportStatus, getReportStatusInfo } from '../../src/features/community-reports/utils/report-status.js';
import { formatSubmittedDate, reportLocationText } from '../../src/features/community-reports/utils/report-display.js';
import { reportTypeLabel } from '../../src/features/community-reports/utils/report-options.js';

afterEach(() => vi.useRealTimers());
const dateValue = '2025-01-15T10:30';
const validDetails = () => ({ description: 'Elephants crossed the road.', incidentDateTime: dateValue, location: { source: 'MAP', coordinates: { latitude: 7.2, longitude: 80.6 } } });
const file = (name, size, type, lastModified = 1) => ({ name, size, type, lastModified });

describe('incident date and time validation', () => {
  it('accepts a real local time, preserves local components, and creates a padded default', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 5, 8, 3));
    expect(defaultIncidentDateTime()).toBe('2025-01-05T08:03');
    const parsed = parseIncidentDateTime(dateValue);
    expect([parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), parsed.getHours(), parsed.getMinutes()]).toEqual([2025, 0, 15, 10, 30]);
    expect(validateIncidentDateTime(dateValue, parsed.getTime())).toBe('');
  });

  it.each([undefined, null, ''])('requires an incident date: %s', (value) => {
    expect(validateIncidentDateTime(value)).toContain('required');
  });

  it.each([123, 'invalid', '2025-01-15', '2025-01-15T10:30:00', '0000-01-15T10:30', '2025-13-15T10:30', '2025-02-30T10:30', '2025-01-15T24:30', '2025-01-15T10:60'])('rejects malformed or impossible local times: %s', (value) => {
    expect(parseIncidentDateTime(value)).toBeNull();
    expect(validateIncidentDateTime(value)).toContain('valid incident');
  });

  it('accepts leap days and the exact five-minute clock tolerance, but rejects later times', () => {
    expect(parseIncidentDateTime('2024-02-29T10:30')).toBeInstanceOf(Date);
    expect(parseIncidentDateTime('2025-02-29T10:30')).toBeNull();
    const now = new Date(dateValue).getTime();
    expect(validateIncidentDateTime('2025-01-15T10:35', now)).toBe('');
    expect(validateIncidentDateTime('2025-01-15T10:36', now)).toContain('future');
  });
});

describe('community report details validation', () => {
  it('accepts valid data and inclusive description, manual text, and coordinate boundaries', () => {
    expect(validateReportDetails(validDetails())).toEqual({});
    for (const [description, manualLocation, latitude, longitude] of [['a'.repeat(10), 'abc', -90, -180], ['b'.repeat(2000), 'c'.repeat(300), 90, 180]]) {
      expect(validateReportDetails({ ...validDetails(), description, location: { source: 'MANUAL', manualLocation, coordinates: { latitude, longitude } } })).toEqual({});
    }
  });

  it.each([undefined, 42, '  tiny  ', 'a'.repeat(2001)])('rejects missing, non-string, short, or long descriptions', (description) => {
    expect(validateReportDetails({ ...validDetails(), description }).description).toContain('between 10');
  });

  it('returns simultaneous errors without losing the incident-date problem', () => {
    const errors = validateReportDetails({ description: '', location: null, incidentDateTime: '' });
    expect(Object.keys(errors).sort()).toEqual(['description', 'incidentDateTime', 'location']);
    expect(errors.location).toContain('Choose a location');
  });

  it.each([null, {}, { latitude: '7', longitude: 80 }, { latitude: NaN, longitude: 80 }, { latitude: -91, longitude: 80 }, { latitude: 91, longitude: 80 }, { latitude: 7, longitude: '80' }, { latitude: 7, longitude: Infinity }, { latitude: 7, longitude: -181 }, { latitude: 7, longitude: 181 }])('rejects invalid coordinate pairs', (coordinates) => {
    expect(validateReportDetails({ ...validDetails(), location: { source: 'GPS', coordinates } }).location).toContain('valid coordinates');
  });

  it.each([null, '  ', 'a'.repeat(301)])('requires usable manual location text', (manualLocation) => {
    expect(validateReportDetails({ ...validDetails(), location: { source: 'MANUAL', manualLocation, coordinates: { latitude: 7, longitude: 80 } } }).manualLocation).toContain('between 3');
  });
});

describe('evidence selection', () => {
  it('accepts supported images/video at their size limits and fingerprints files deterministically', () => {
    const files = [file('photo.jpg', 5 * 1024 ** 2, 'image/jpeg'), file('clip.mp4', 25 * 1024 ** 2, 'video/mp4'), file('photo.webp', 10, 'image/webp')];
    expect(validateEvidenceSelection(files, [])).toEqual({ accepted: files, messages: [] });
    expect(evidenceFileKey(files[0])).toBe('photo.jpg:5242880:image/jpeg:1');
  });

  it('rejects empty, unsupported, oversized image, and oversized video files with distinct messages', () => {
    const result = validateEvidenceSelection([file('empty.png', 0, 'image/png'), file('doc.pdf', 5, 'application/pdf'), file('big.png', 5 * 1024 ** 2 + 1, 'image/png'), file('big.mp4', 25 * 1024 ** 2 + 1, 'video/mp4')], []);
    expect(result.accepted).toEqual([]);
    expect(result.messages).toEqual(['Empty files cannot be uploaded.', 'Only JPG, PNG, WEBP, and MP4 files are allowed.', 'Images must not exceed 5 MB.', 'Videos must not exceed 25 MB.']);
  });

  it('does not reselect existing or duplicate input files and applies the total three-file cap', () => {
    const selected = file('existing.png', 1, 'image/png');
    const fresh = file('fresh.png', 1, 'image/png');
    const third = file('third.png', 1, 'image/png');
    const excess = file('fourth.png', 1, 'image/png');
    const result = validateEvidenceSelection([selected, fresh, fresh, third, excess, excess], [selected]);
    expect(result.accepted).toEqual([fresh, third]);
    expect(result.messages).toEqual(['This file has already been selected.', 'You can attach up to 3 files.']);
    expect(validateEvidenceSelection([fresh], [selected, third, excess]).accepted).toEqual([]);
  });

  it('formats sub-megabyte sizes safely and megabyte sizes consistently', () => {
    expect(formatFileSize(0)).toBe('1 KB');
    expect(formatFileSize(2048)).toBe('2 KB');
    expect(formatFileSize(1024 ** 2)).toBe('1.0 MB');
  });
});

describe('report display helpers', () => {
  it('uses only known status values and safely defaults unknown legacy values', () => {
    for (const status of ['offline_pending', 'under_review', 'approved', 'rejected']) {
      expect(getReportStatus(status)).toBe(status);
      expect(getReportStatusInfo(status).description.length).toBeGreaterThan(0);
    }
    for (const unknown of [undefined, null, 'toString', '__proto__', 'PENDING']) {
      expect(getReportStatus(unknown)).toBe('under_review');
      expect(getReportStatusInfo(unknown).label).toBe('UNDER REVIEW');
    }
  });

  it('prefers named locations, then manual text, then finite coordinates', () => {
    expect(reportLocationText({ displayName: 'Kandy', manualLocation: 'Temple', coordinates: { latitude: 7, longitude: 80 } })).toBe('Kandy');
    expect(reportLocationText({ manualLocation: 'Temple' })).toBe('Temple');
    expect(reportLocationText({ coordinates: { latitude: 7.123456, longitude: 80 } })).toBe('7.12346, 80.00000');
    for (const location of [undefined, {}, { coordinates: { latitude: Infinity, longitude: 80 } }, { coordinates: { latitude: 7, longitude: NaN } }]) expect(reportLocationText(location)).toBe('Location not available');
  });

  it('formats real timestamps and makes absent/invalid dates and unknown report types explicit', () => {
    const timestamp = '2025-02-01T12:00:00Z';
    expect(formatSubmittedDate(timestamp)).toBe(new Date(timestamp).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' }));
    expect(formatSubmittedDate(undefined)).toBe('Date unavailable');
    expect(formatSubmittedDate('bad')).toBe('Date unavailable');
    expect(reportTypeLabel('WILDLIFE_SIGHTING')).toBe('Wildlife Sighting');
    expect(reportTypeLabel('SUSPICIOUS_ACTIVITY')).toBe('Suspicious Activity');
    expect(reportTypeLabel('CUSTOM')).toBe('CUSTOM');
  });
});
