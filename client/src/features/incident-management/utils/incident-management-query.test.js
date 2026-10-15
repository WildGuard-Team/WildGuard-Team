import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createIncidentManagementQuery, incidentManagementQueryReducer,
  serializeIncidentManagementQuery, validateIncidentManagementDates,
} from './incident-management-query.js';

test('manager list defaults to the first page of 25 incidents sorted newest first', () => {
  const query = createIncidentManagementQuery();
  assert.equal(query.page, 1);
  assert.equal(query.pageSize, 25);
  assert.equal(query.sort, 'newest');
  assert.deepEqual(Object.fromEntries(new URLSearchParams(serializeIncidentManagementQuery(query))), {
    page: '1', pageSize: '25', sort: 'newest',
  });
});

test('combining search and filters preserves previous criteria and resets pagination', () => {
  let query = { ...createIncidentManagementQuery(), page: 4 };
  const criteria = {
    search: '  FI-2026-001  ', incidentType: 'POACHING', riskLevel: 'HIGH', parkZone: 'Yala / Zone 1',
    startDate: '2026-10-01', endDate: '2026-10-15', status: 'SUBMITTED',
  };
  for (const [name, value] of Object.entries(criteria)) {
    query = incidentManagementQueryReducer({ ...query, page: 4 }, { type: 'filter', name, value });
    assert.equal(query.page, 1);
  }
  const params = new URLSearchParams(serializeIncidentManagementQuery(query));
  for (const [name, value] of Object.entries(criteria)) assert.equal(params.get(name), value.trim());
  assert.equal(params.get('pageSize'), '25');
  assert.equal(params.get('page'), '1');
});

test('sorting and changing page size restart the list while clearing filters restores the full scope', () => {
  let query = { ...createIncidentManagementQuery(), search: 'Jane', riskLevel: 'HIGH', page: 3 };
  query = incidentManagementQueryReducer(query, { type: 'sort', value: 'oldest' });
  assert.equal(query.page, 1);
  assert.equal(query.search, 'Jane');
  assert.equal(query.sort, 'oldest');
  query = incidentManagementQueryReducer({ ...query, page: 3 }, { type: 'pageSize', value: 50 });
  assert.equal(query.pageSize, 50);
  assert.equal(query.page, 1);
  query = incidentManagementQueryReducer(query, { type: 'clear' });
  assert.deepEqual(query, { ...createIncidentManagementQuery(), pageSize: 50 });
});

test('pagination cannot be changed to invalid values or corrupted by unsupported filter fields', () => {
  const query = createIncidentManagementQuery();
  for (const value of [0, -1, 1.5, Infinity, '2']) {
    assert.equal(incidentManagementQueryReducer(query, { type: 'page', value }), query);
  }
  assert.equal(incidentManagementQueryReducer(query, { type: 'pageSize', value: 10000 }), query);
  assert.equal(incidentManagementQueryReducer(query, { type: 'filter', name: 'page', value: 'oops' }), query);
  assert.equal(incidentManagementQueryReducer(query, { type: 'page', value: 2 }).page, 2);
});

test('incident date filters accept open ranges and same-day ranges but reject impossible or reversed dates', () => {
  for (const range of [
    {}, { startDate: '2026-10-15' }, { endDate: '2026-10-15' },
    { startDate: '2026-10-15', endDate: '2026-10-15' },
    { startDate: '2024-02-29', endDate: '2026-10-15' },
  ]) assert.equal(validateIncidentManagementDates(range), '');
  assert.match(validateIncidentManagementDates({ startDate: '2026-10-16', endDate: '2026-10-15' }), /on or after/);
  for (const startDate of ['2026-02-29', '2026-02-30', '2026-13-01', '2026-1-01', 'invalid']) {
    assert.match(validateIncidentManagementDates({ startDate }), /valid start date/);
  }
  assert.match(validateIncidentManagementDates({ endDate: '2026-02-30' }), /valid end date/);
});
