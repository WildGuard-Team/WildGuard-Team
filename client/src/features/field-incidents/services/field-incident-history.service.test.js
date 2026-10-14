import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterFieldIncidents,
  mergeFieldIncidents,
  normalizePendingFieldIncident,
  summarizeFieldIncidents,
} from './field-incident-history.service.js';
import { FIELD_INCIDENT_PENDING_SYNC, FIELD_INCIDENT_SUBMITTED } from '../config/field-incident.constants.js';
import { formatFieldIncidentDateTime } from '../utils/field-incident-format.js';
import { FieldIncidentNetworkError, getMyFieldIncidents } from './field-incident.service.js';

const submitted = [
  {
    id: 'server-a', clientIncidentId: 'client-a', referenceNumber: 'FI-20261008-ABC123',
    incidentType: 'POACHING', riskLevel: 'HIGH', status: FIELD_INCIDENT_SUBMITTED,
    incidentDateTime: '2026-10-08T10:00:00Z', createdAt: '2026-10-08T11:00:00Z',
    parkZone: 'Yala National Park', blockArea: 'Block 1', description: 'A snare discovered near the waterhole.',
  },
  {
    id: 'server-b', clientIncidentId: 'client-b', referenceNumber: 'FI-20261007-DEF456',
    incidentType: 'WILDLIFE_SIGHTING', riskLevel: 'LOW', status: FIELD_INCIDENT_SUBMITTED,
    incidentDateTime: '2026-10-07T08:00:00Z', createdAt: '2026-10-07T09:00:00Z',
    parkZone: 'Wilpattu National Park', blockArea: 'North sector', description: 'Leopard sighting.',
  },
];

const evidence = new Blob(['photo'], { type: 'image/jpeg' });
const pendingRecord = {
  clientIncidentId: 'client-c', ownerId: 'ranger-a', status: FIELD_INCIDENT_PENDING_SYNC,
  createdAt: '2026-10-09T09:00:00Z', syncAttempts: 2, lastAttemptAt: '2026-10-09T10:00:00Z',
  lastError: 'Unable to reach WildGuard.',
  draft: {
    incidentType: 'INJURED_ANIMAL', incidentDate: '2026-10-09', incidentTime: '12:00',
    riskLevel: 'HIGH', parkZone: 'Yala National Park', blockArea: 'Block 2',
    location: { source: 'GPS', coordinates: { latitude: 6.3, longitude: 81.4 }, description: 'Beside the patrol road.' },
    description: 'Injured elephant.', additionalNotes: 'Veterinary team requested.', evidence: [evidence],
  },
};

const incidents = mergeFieldIncidents(submitted, [pendingRecord], 'ranger-a');

test('merge submitted and current Ranger pending incidents into one common shape', () => {
  const anotherRangerRecord = { ...pendingRecord, clientIncidentId: 'client-private', ownerId: 'ranger-b' };
  const result = mergeFieldIncidents(submitted, [pendingRecord, anotherRangerRecord], 'ranger-a');
  assert.equal(result.length, 3);
  const pending = result[2];
  assert.equal(pending.referenceNumber, null);
  assert.equal(pending.clientIncidentId, pendingRecord.clientIncidentId);
  assert.equal(pending.status, FIELD_INCIDENT_PENDING_SYNC);
  assert.equal(pending.incidentDateTime, new Date('2026-10-09T12:00:00').toISOString());
  assert.deepEqual(pending.location, pendingRecord.draft.location);
  assert.equal(pending.evidence[0], evidence);
  assert.equal(pending.syncAttempts, 2);
  assert.equal(pending.lastAttemptAt, pendingRecord.lastAttemptAt);
  assert.equal(pending.lastError, pendingRecord.lastError);
  assert.equal(pending.createdAt, pendingRecord.createdAt);
});

test('submitted incident wins when a synchronized pending record has the same client ID', () => {
  const synchronized = { ...pendingRecord, clientIncidentId: 'client-a' };
  const result = mergeFieldIncidents(submitted, [synchronized, pendingRecord, pendingRecord], 'ranger-a');
  assert.equal(result.length, 3);
  assert.equal(result.find((incident) => incident.clientIncidentId === 'client-a').id, 'server-a');
  assert.deepEqual(summarizeFieldIncidents(result), { total: 3, submitted: 2, pendingSync: 1, highRisk: 2 });
});

test('status filtering includes only submitted or pending incidents', () => {
  assert.equal(filterFieldIncidents(incidents, { status: 'ALL' }).length, 3);
  assert.equal(filterFieldIncidents(incidents, { status: FIELD_INCIDENT_SUBMITTED }).length, 2);
  assert.deepEqual(filterFieldIncidents(incidents, { status: FIELD_INCIDENT_PENDING_SYNC }).map((incident) => incident.clientIncidentId), ['client-c']);
});

test('incident type filtering uses the existing incident type values', () => {
  assert.deepEqual(filterFieldIncidents(incidents, { incidentType: 'POACHING' }).map((incident) => incident.id), ['server-a']);
  assert.equal(filterFieldIncidents(incidents, { incidentType: 'ILLEGAL_LOGGING' }).length, 0);
});

test('risk filtering combines with status and incident type filters', () => {
  assert.equal(filterFieldIncidents(incidents, { riskLevel: 'HIGH' }).length, 2);
  assert.deepEqual(filterFieldIncidents(incidents, {
    riskLevel: 'HIGH', status: FIELD_INCIDENT_SUBMITTED, incidentType: 'POACHING',
  }).map((incident) => incident.id), ['server-a']);
});

test('search matches reference, park, area and description regardless of case or surrounding spaces', () => {
  for (const search of [' ABC123 ', 'yala', 'BLOCK 1', 'Waterhole']) {
    assert.ok(filterFieldIncidents(incidents, { search }).some((incident) => incident.id === 'server-a'));
  }
  assert.deepEqual(filterFieldIncidents(incidents, { search: 'injured', status: FIELD_INCIDENT_PENDING_SYNC })
    .map((incident) => incident.clientIncidentId), ['client-c']);
  assert.equal(filterFieldIncidents(incidents, { search: 'does not match' }).length, 0);
});

test('newest and oldest sort use incident time with a created-at fallback without mutating source order', () => {
  const sample = [
    { id: 'old', incidentDateTime: '2026-10-01T00:00:00Z', createdAt: '2026-10-10T00:00:00Z' },
    { id: 'fallback', incidentDateTime: 'invalid', createdAt: '2026-10-02T00:00:00Z' },
    { id: 'new', incidentDateTime: '2026-10-03T00:00:00Z', createdAt: '2026-10-03T00:00:00Z' },
  ];
  assert.deepEqual(filterFieldIncidents(sample).map((incident) => incident.id), ['new', 'fallback', 'old']);
  assert.deepEqual(filterFieldIncidents(sample, { sort: 'OLDEST' }).map((incident) => incident.id), ['old', 'fallback', 'new']);
  assert.deepEqual(sample.map((incident) => incident.id), ['old', 'fallback', 'new']);
});

test('summary counts cover submitted and pending high-risk incidents and an empty history', () => {
  assert.deepEqual(summarizeFieldIncidents(incidents), { total: 3, submitted: 2, pendingSync: 1, highRisk: 2 });
  assert.deepEqual(summarizeFieldIncidents([]), { total: 0, submitted: 0, pendingSync: 0, highRisk: 0 });
});

test('missing local incident times remain unavailable and can use created-at for sorting', () => {
  const pending = normalizePendingFieldIncident({ ...pendingRecord, draft: {} });
  assert.equal(pending.incidentDateTime, null);
  assert.deepEqual(pending.evidence, []);
  assert.equal(formatFieldIncidentDateTime(pending.incidentDateTime), 'Not available');
  assert.equal(formatFieldIncidentDateTime('invalid'), 'Not available');
});

test('history API uses the authenticated mine endpoint without a client-provided Ranger ID', async (context) => {
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/field-incidents/mine');
    assert.deepEqual(options, { method: 'GET', credentials: 'include' });
    return { ok: true, status: 200, json: async () => ({ incidents: submitted }) };
  });
  assert.deepEqual(await getMyFieldIncidents(), submitted);
});

test('history API distinguishes network failures from denied access', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(getMyFieldIncidents(), FieldIncidentNetworkError);
  fetchMock.mock.mockImplementation(async () => ({ ok: false, status: 403, json: async () => ({}) }));
  await assert.rejects(getMyFieldIncidents(), /permission to view field incident history/);
});

test('history API rejects an invalid success response instead of reporting an empty history', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => ({ ok: true, status: 200, json: async () => ({}) }));
  await assert.rejects(getMyFieldIncidents(), /Unable to load your field incidents/);
});
