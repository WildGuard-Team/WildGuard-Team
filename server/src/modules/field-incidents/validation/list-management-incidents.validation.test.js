import test from 'node:test';
import assert from 'node:assert/strict';
import { validateManagementIncidentQuery } from './list-management-incidents.validation.js';

test('manager incident query defaults to a bounded newest-first page', () => {
  const query = validateManagementIncidentQuery();
  assert.equal(query.page, 1);
  assert.equal(query.pageSize, 25);
  assert.equal(query.sort, 'newest');
});

test('manager query normalizes combined filters and inclusive Colombo calendar boundaries', () => {
  const query = validateManagementIncidentQuery({
    search: '  Injured   Animal ', incidentType: 'injured_animal', riskLevel: 'high',
    parkZone: '  Yala   National Park ', status: 'submitted',
    startDate: '2026-10-15', endDate: '2026-10-15', page: '2', pageSize: '10', sort: 'oldest',
  });
  assert.equal(query.search, 'Injured Animal');
  assert.equal(query.incidentType, 'INJURED_ANIMAL');
  assert.equal(query.riskLevel, 'HIGH');
  assert.equal(query.parkZone, 'Yala National Park');
  assert.equal(query.status, 'SUBMITTED');
  assert.equal(query.page, 2);
  assert.equal(query.pageSize, 10);
  assert.equal(query.sort, 'oldest');
  assert.equal(query.startDate.toISOString(), '2026-10-14T18:30:00.000Z');
  assert.equal(query.endDate.toISOString(), '2026-10-15T18:30:00.000Z');
});

for (const query of [
  { startDate: '2026-02-30' }, { endDate: '2025-02-29' },
  { startDate: '10/15/2026' }, { startDate: '2026-10-16', endDate: '2026-10-15' },
  { page: '0' }, { page: '-1' }, { page: '1.5' }, { page: '1e3' },
  { page: '9007199254740992' }, { pageSize: '101' }, { pageSize: { $gt: 0 } },
  { incidentType: ['POACHING'] }, { riskLevel: 'CRITICAL' }, { status: 'APPROVED' },
  { search: { $ne: '' } }, { search: 'a'.repeat(101) }, { sort: 'random' },
]) {
  test(`rejects invalid manager query ${JSON.stringify(query)}`, () => {
    assert.throws(() => validateManagementIncidentQuery(query), { status: 400 });
  });
}

test('valid leap day is accepted and a single date filter is supported', () => {
  const query = validateManagementIncidentQuery({ startDate: '2024-02-29' });
  assert.equal(query.startDate.toISOString(), '2024-02-28T18:30:00.000Z');
  assert.equal(query.endDate, undefined);
});
