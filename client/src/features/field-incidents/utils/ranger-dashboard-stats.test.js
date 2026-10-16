import assert from 'node:assert/strict';
import test from 'node:test';
import { FIELD_INCIDENT_PENDING_SYNC, FIELD_INCIDENT_SUBMITTED } from '../config/field-incident.constants.js';
import { mergeFieldIncidents } from '../services/field-incident-history.service.js';
import { summarizeRangerDashboard } from './ranger-dashboard-stats.js';

const now = new Date(2026, 9, 16, 12);
const today = new Date(2026, 9, 16, 9).toISOString();
const yesterday = new Date(2026, 9, 15, 9).toISOString();

test('empty incident history has zero dashboard counts', () => {
  assert.deepEqual(summarizeRangerDashboard([], now), { total: 0, submittedToday: 0, pendingSync: 0 });
});

test('today uses submission time rather than the time an incident occurred', () => {
  const incidents = [
    { status: FIELD_INCIDENT_SUBMITTED, createdAt: today, incidentDateTime: yesterday },
    { status: FIELD_INCIDENT_SUBMITTED, createdAt: yesterday, incidentDateTime: today },
    { status: FIELD_INCIDENT_PENDING_SYNC, createdAt: today, incidentDateTime: today },
  ];
  assert.deepEqual(summarizeRangerDashboard(incidents, now), { total: 3, submittedToday: 1, pendingSync: 1 });
});

test('missing or invalid submission dates do not count as submissions today', () => {
  const incidents = [undefined, null, '', 'not-a-date'].map((createdAt) => ({
    status: FIELD_INCIDENT_SUBMITTED, createdAt, incidentDateTime: today,
  }));
  assert.deepEqual(summarizeRangerDashboard(incidents, now), { total: 4, submittedToday: 0, pendingSync: 0 });
});

test('submission day includes local midnight through the last millisecond before the next day', () => {
  const dates = [
    new Date(2026, 9, 15, 23, 59, 59, 999),
    new Date(2026, 9, 16, 0, 0, 0, 0),
    new Date(2026, 9, 16, 23, 59, 59, 999),
    new Date(2026, 9, 17, 0, 0, 0, 0),
    new Date(2025, 9, 16, 12),
    new Date(2026, 8, 16, 12),
  ];
  const incidents = dates.map((date) => ({ status: FIELD_INCIDENT_SUBMITTED, createdAt: date.toISOString() }));
  assert.deepEqual(summarizeRangerDashboard(incidents, now), { total: 6, submittedToday: 2, pendingSync: 0 });
});

test('dashboard counts use the existing owner filtering and synchronization deduplication', () => {
  const submitted = [{ id: 'saved', clientIncidentId: 'synced', status: FIELD_INCIDENT_SUBMITTED, createdAt: today }];
  const pending = (clientIncidentId, ownerId = 'ranger-a') => ({
    clientIncidentId, ownerId, status: FIELD_INCIDENT_PENDING_SYNC, createdAt: today, draft: {},
  });
  const incidents = mergeFieldIncidents(submitted, [
    pending('synced'), pending('queued'), pending('queued'), pending('foreign', 'ranger-b'),
  ], 'ranger-a');
  assert.deepEqual(summarizeRangerDashboard(incidents, now), { total: 2, submittedToday: 1, pendingSync: 1 });
  assert.equal(submitted.length, 1);
});
