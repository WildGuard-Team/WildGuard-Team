import assert from 'node:assert/strict';
import test from 'node:test';
import {
  toReportRequest, validateReportForm,
} from '../src/features/conservation-reports/validation/report-parameters.validation.js';

const baseForm = {
  reportType: 'INCIDENT_REPORT', startDate: '2026-01-01', endDate: '2026-12-31',
  park: 'Yala National Park', location: 'Buffer Zone', incidentType: 'HUMAN_WILDLIFE_CONFLICT',
  severity: 'HIGH', routeSourceId: '', status: '', conflictType: '',
};

test('client report validation accepts a 365-day range and rejects reversed dates', () => {
  assert.deepEqual(validateReportForm(baseForm), {});
  assert.match(validateReportForm({ ...baseForm, startDate: '2026-10-01', endDate: '2026-09-01' }).endDate, /on or after/);
});

test('client report validation enforces the inclusive 366-day maximum', () => {
  assert.deepEqual(validateReportForm({ ...baseForm, startDate: '2024-01-01', endDate: '2024-12-31' }), {});
  assert.match(validateReportForm({ ...baseForm, startDate: '2024-01-01', endDate: '2025-01-01' }).endDate, /366 days/);
});

test('Incident request includes only Incident Report filters', () => {
  assert.deepEqual(toReportRequest({ ...baseForm, routeSourceId: 'IGNORED', status: 'COMPLETED' }), {
    reportType: 'INCIDENT_REPORT', startDate: '2026-01-01', endDate: '2026-12-31',
    filters: {
      park: 'Yala National Park', location: 'Buffer Zone',
      incidentTypes: ['HUMAN_WILDLIFE_CONFLICT'], severities: ['HIGH'],
    },
  });
});

test('Patrol and Conflict requests send their applicable filters only', () => {
  const patrol = toReportRequest({
    ...baseForm, reportType: 'PATROL_COVERAGE_REPORT', routeSourceId: 'WG-ROUTE-YA-NORTH', status: 'COMPLETED',
  });
  assert.deepEqual(patrol.filters, {
    park: 'Yala National Park', routeSourceIds: ['WG-ROUTE-YA-NORTH'], statuses: ['COMPLETED'],
  });
  const conflict = toReportRequest({
    ...baseForm, reportType: 'CONFLICT_TREND_REPORT', conflictType: 'CROP_DAMAGE',
  });
  assert.deepEqual(conflict.filters, {
    park: 'Yala National Park', location: 'Buffer Zone', severities: ['HIGH'], conflictTypes: ['CROP_DAMAGE'],
  });
});
