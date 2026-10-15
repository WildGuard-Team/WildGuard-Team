import assert from 'node:assert/strict';
import test from 'node:test';
import { validateCreateCommunityReport } from '../src/modules/community-reports/validation/create-community-report.validation.js';
import { validateIncidentDateTime } from '../src/modules/community-reports/validation/incident-date-time.validation.js';
import { validateCoordinates, validateLocation, validateLocationSearchQuery, normalizeLegacyManualLocation } from '../src/modules/community-reports/validation/location.validation.js';
import { validateMyReportsQuery } from '../src/modules/community-reports/validation/my-reports.validation.js';
import { validateMyReportId } from '../src/modules/community-reports/validation/my-report-details.validation.js';

const payload = (overrides = {}) => ({
  clientSubmissionId: ' submission-1 ', reportType: 'SUSPICIOUS_ACTIVITY',
  description: ' Suspicious activity near the forest. ', incidentDateTime: '2024-02-29T12:34:56+05:30',
  location: { source: 'GPS', coordinates: { latitude: 7.2, longitude: 80.6 }, displayName: ' Kandy ' },
  ...overrides,
});
const invalid = (fn, message) => assert.throws(fn, { status: 400, ...(message ? { message } : {}) });

test('create validation normalizes text, accepts every report type, and preserves the timezone instant', () => {
  for (const reportType of ['WILDLIFE_SIGHTING', 'HUMAN_WILDLIFE_CONFLICT', 'SUSPICIOUS_ACTIVITY']) {
    const value = validateCreateCommunityReport(payload({ reportType }));
    assert.equal(value.clientSubmissionId, 'submission-1');
    assert.equal(value.description, 'Suspicious activity near the forest.');
    assert.equal(value.reportType, reportType);
    assert.equal(value.incidentDateTime.toISOString(), '2024-02-29T07:04:56.000Z');
    assert.equal(value.location.displayName, 'Kandy');
  }
});

test('create validation rejects invalid bodies, injection fields and ambiguous location input', () => {
  for (const body of [undefined, null, [], 42, 'report']) invalid(() => validateCreateCommunityReport(body), 'A JSON object is required.');
  for (const field of ['reporterId', 'status', 'referenceNumber', 'evidence']) invalid(() => validateCreateCommunityReport(payload({ [field]: 'injected' })));
  invalid(() => validateCreateCommunityReport(payload({ manualLocation: 'Kandy' })), 'Provide either location or legacy manualLocation, not both.');
  for (const reportType of [undefined, '', null, 'OTHER', ['WILDLIFE_SIGHTING']]) invalid(() => validateCreateCommunityReport(payload({ reportType })));
});

test('required create text uses trimmed length boundaries rather than coercion', () => {
  for (const clientSubmissionId of [undefined, null, '', '  ', 123, {}, [], 'a'.repeat(101)]) invalid(() => validateCreateCommunityReport(payload({ clientSubmissionId })));
  for (const description of [undefined, null, '', ' 123456789 ', 5, 'a'.repeat(2001)]) invalid(() => validateCreateCommunityReport(payload({ description })));
  for (const description of ['a'.repeat(10), 'a'.repeat(2000)]) assert.equal(validateCreateCommunityReport(payload({ description, clientSubmissionId: 'a'.repeat(100) })).description, description);
});

test('legacy manual locations remain normalized and cannot be omitted or silently coerced', () => {
  const input = payload({ location: undefined, manualLocation: ' Forest entrance ' });
  assert.deepEqual(validateCreateCommunityReport(input).location, { source: 'MANUAL', coordinates: undefined, displayName: 'Forest entrance', manualLocation: 'Forest entrance' });
  assert.equal(normalizeLegacyManualLocation('abc').manualLocation, 'abc');
  assert.equal(normalizeLegacyManualLocation('x'.repeat(300)).manualLocation.length, 300);
  for (const location of [undefined, null, 23, '', 'ab', 'x'.repeat(301)]) invalid(() => normalizeLegacyManualLocation(location));
});

test('incident date validates leap years, offset zones, millisecond precision and clock tolerance', () => {
  const now = Date.parse('2024-03-01T00:00:00Z');
  for (const value of ['2024-02-29T00:00:00Z', '2000-02-29T00:00:00Z', '2024-02-29T23:59:59.1Z', '2024-02-29T23:59:59.123Z', '2024-03-01T05:30:00+05:30', '2024-02-29T19:00:00-05:00']) assert.ok(Number.isFinite(validateIncidentDateTime(value, now).getTime()));
  assert.equal(validateIncidentDateTime('2024-03-01T00:05:00Z', now).getTime(), now + 300000);
  invalid(() => validateIncidentDateTime('2024-03-01T00:05:00.001Z', now), 'Incident date and time cannot be in the future.');
});

test('incident date rejects missing values, rollover dates, invalid ranges and non-qualified instants', () => {
  for (const value of [undefined, null, '']) invalid(() => validateIncidentDateTime(value), 'Incident date and time is required.');
  for (const value of [42, new Date(), '2024-01-01', '2024-01-01T10:00:00', '2024-01-01T10:00:00.1234Z', '0000-01-01T00:00:00Z', '1900-02-29T00:00:00Z', '2023-02-29T00:00:00Z', '2024-02-30T00:00:00Z', '2024-00-01T00:00:00Z', '2024-13-01T00:00:00Z', '2024-01-00T00:00:00Z', '2024-04-31T00:00:00Z', '2024-01-01T24:00:00Z', '2024-01-01T23:60:00Z', '2024-01-01T23:59:60Z', '2024-01-01T00:00:00+24:00', '2024-01-01T00:00:00+00:60']) invalid(() => validateIncidentDateTime(value), 'Enter a valid incident date and time.');
});

test('coordinates accept inclusive earth boundaries and reject unsupported shapes or fields', () => {
  for (const coordinates of [{ latitude: -90, longitude: -180 }, { latitude: 90, longitude: 180 }, { latitude: 0, longitude: 0 }]) assert.deepEqual(validateCoordinates(coordinates), coordinates);
  for (const coordinates of [null, undefined, [], new Date(), Object.create(null), { latitude: 0, longitude: 0, altitude: 1 }]) invalid(() => validateCoordinates(coordinates), 'Coordinates must contain only latitude and longitude.');
  for (const latitude of [undefined, null, '7', NaN, Infinity, -90.001, 90.001]) invalid(() => validateCoordinates({ latitude, longitude: 0 }), 'Latitude must be a finite number between -90 and 90.');
  for (const longitude of [undefined, null, '80', NaN, -Infinity, -180.001, 180.001]) invalid(() => validateCoordinates({ latitude: 0, longitude }), 'Longitude must be a finite number between -180 and 180.');
});

test('structured locations enforce source, optional display text and required manual text limits', () => {
  const coordinates = { latitude: 7, longitude: 80 };
  assert.deepEqual(validateLocation({ source: 'MAP', coordinates }), { source: 'MAP', coordinates, displayName: undefined, manualLocation: undefined });
  assert.equal(validateLocation({ source: 'MANUAL', coordinates, displayName: ' ', manualLocation: ' Kandy ' }).manualLocation, 'Kandy');
  assert.equal(validateLocation({ source: 'GPS', coordinates, displayName: 'x'.repeat(300) }).displayName.length, 300);
  for (const location of [undefined, null, [], new Date(), { source: 'GPS', coordinates, privateField: true }]) invalid(() => validateLocation(location));
  for (const source of [undefined, 'gps', 'UNKNOWN']) invalid(() => validateLocation({ source, coordinates }));
  for (const displayName of [null, 1, 'x'.repeat(301)]) invalid(() => validateLocation({ source: 'GPS', coordinates, displayName }));
  for (const manualLocation of [undefined, null, '', 'ab', 'x'.repeat(301)]) invalid(() => validateLocation({ source: 'MANUAL', coordinates, manualLocation }));
});

test('location search accepts trimmed boundary queries and rejects blanks, arrays and oversized input', () => {
  assert.equal(validateLocationSearchQuery(' Kandy '), 'Kandy');
  assert.equal(validateLocationSearchQuery('abc'), 'abc');
  assert.equal(validateLocationSearchQuery('a'.repeat(300)).length, 300);
  for (const value of [undefined, null, 5, ['Kandy'], '', 'ab', 'a'.repeat(301)]) invalid(() => validateLocationSearchQuery(value));
});

test('My Reports permits only supported singleton status filters', () => {
  assert.equal(validateMyReportsQuery({}), undefined);
  for (const status of ['under_review', 'approved', 'rejected']) assert.equal(validateMyReportsQuery({ status }), status);
  for (const status of ['', null, 'offline_pending', 'APPROVED', ['approved', 'rejected']]) invalid(() => validateMyReportsQuery({ status }));
  invalid(() => validateMyReportsQuery({ reporterId: 'someone-else' }), 'Only the status filter is allowed.');
});

test('Report Details requires a literal 24-character hexadecimal id', () => {
  const id = 'ABCDEF0123456789abcdef01';
  assert.equal(validateMyReportId(id), id);
  for (const value of [null, undefined, 42, {}, [], 'abcdefghijkl', 'g'.repeat(24), 'a'.repeat(25), ' a'.repeat(12)]) invalid(() => validateMyReportId(value));
});
