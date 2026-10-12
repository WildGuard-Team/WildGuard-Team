import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { AUTH_TOKEN_COOKIE, PARK_MANAGER } from '../src/modules/auth/config/auth.constants.js';
import { createAuthToken } from '../src/modules/auth/utils/token.js';
import { CONSERVATION_REPORT_TYPES } from '../src/modules/conservation-reports/config/conservation-report.constants.js';
import {
  buildIncidentQuery, createIncidentReportSourceRepository,
} from '../src/modules/conservation-reports/repositories/incident-report-source.repository.js';
import { reportSourceIncidents } from '../src/modules/conservation-reports/seeds/reporting-source-data.js';
import { generateConservationReport } from '../src/modules/conservation-reports/services/generate-conservation-report.service.js';
import {
  aggregateIncidentReport, createIncidentReportStrategy,
} from '../src/modules/conservation-reports/services/incident-report.strategy.js';
import { createReportStrategyRegistry } from '../src/modules/conservation-reports/services/report-strategy-registry.js';

const clientOrigin = 'http://localhost:3000';
const jwtSecret = 'a-test-secret-that-is-longer-than-thirty-two-characters';
const managerId = new mongoose.Types.ObjectId().toString();
const septemberYalaParameters = {
  reportType: CONSERVATION_REPORT_TYPES.INCIDENT,
  startDate: new Date('2026-09-01T00:00:00.000Z'),
  endDate: new Date('2026-09-30T23:59:59.999Z'),
  filters: { park: 'Yala National Park' },
};

test('incident repository builds inclusive and escaped filter queries', async () => {
  const parameters = {
    ...septemberYalaParameters,
    filters: {
      park: 'Yala National Park', location: 'Block I (North)',
      incidentTypes: ['HUMAN_WILDLIFE_CONFLICT'], severities: ['HIGH'],
    },
  };
  const query = buildIncidentQuery(parameters);
  assert.deepEqual(query.occurredAt, {
    $gte: parameters.startDate, $lte: parameters.endDate,
  });
  assert.equal(query.park.test('yala national park'), true);
  assert.equal(query.location.test('Block I (North) sector'), true);
  assert.deepEqual(query.incidentType, { $in: ['HUMAN_WILDLIFE_CONFLICT'] });
  assert.deepEqual(query.severity, { $in: ['HIGH'] });

  let receivedQuery;
  let receivedSort;
  const model = {
    find(value) {
      receivedQuery = value;
      return {
        sort(sort) {
          receivedSort = sort;
          return { lean: async () => [] };
        },
      };
    },
  };
  await createIncidentReportSourceRepository(model).findForReport(parameters);
  assert.equal(receivedQuery.park.test('YALA NATIONAL PARK'), true);
  assert.deepEqual(receivedSort, { occurredAt: 1, sourceId: 1 });
});

test('incident aggregation calculates correct totals and filter-derived chart values', () => {
  const incidents = selectFixtureIncidents(septemberYalaParameters);
  const results = aggregateIncidentReport(incidents, septemberYalaParameters);

  assert.deepEqual(results.summary, {
    totalIncidents: 2,
    distinctLocations: 2,
    highSeverityIncidents: 1,
    criticalIncidents: 0,
    averageIncidentsPerDay: 0.07,
  });
  assert.equal(results.timeGranularity, 'DAY');
  assert.deepEqual(results.breakdowns.byType, [{ label: 'HUMAN_WILDLIFE_CONFLICT', count: 2 }]);
  assert.deepEqual(results.breakdowns.bySeverity, [
    { label: 'HIGH', count: 1 }, { label: 'MEDIUM', count: 1 },
  ]);
  assert.deepEqual(results.breakdowns.byLocation, [
    { label: 'Block I - Patanangala', count: 1 },
    { label: 'Menik River Corridor', count: 1 },
  ]);
  assert.equal(results.breakdowns.byTime.length, 30);
  assert.equal(results.breakdowns.byTime.reduce((total, item) => total + item.count, 0), 2);
  assert.equal(results.incidents.length, results.summary.totalIncidents);
});

test('incident generation persists metadata and actual calculations under a stable view location', async () => {
  const incidents = selectFixtureIncidents(septemberYalaParameters);
  const strategies = createReportStrategyRegistry([
    createIncidentReportStrategy({ findForReport: async () => incidents }),
  ]);
  let stored;
  const reports = {
    async create(report) {
      stored = report;
      return report;
    },
  };

  const result = await generateConservationReport({
    parameters: septemberYalaParameters,
    managerId,
    strategies,
    reports,
    reportIdFactory: () => 'CR-2026-INCIDENT01',
    clock: () => new Date('2026-10-01T08:00:00.000Z'),
  });

  assert.equal(result.noData, false);
  assert.equal(stored.requestedBy, managerId);
  assert.equal(stored.results.summary.totalIncidents, 2);
  assert.equal(stored.fileLocation, '/api/conservation-reports/CR-2026-INCIDENT01');
  assert.deepEqual(stored.dataProvenance, ['SEEDED_ASSIGNMENT_DATA']);
  assert.equal(result.report.reportId, stored.reportId);
});

test('incident generation reports no data without storing an empty report', async () => {
  const strategies = createReportStrategyRegistry([
    createIncidentReportStrategy({ findForReport: async () => [] }),
  ]);
  let createCalled = false;
  const result = await generateConservationReport({
    parameters: septemberYalaParameters,
    managerId,
    strategies,
    reports: { create: async () => { createCalled = true; } },
  });

  assert.equal(result.noData, true);
  assert.match(result.message, /No conservation data/);
  assert.equal(createCalled, false);
});

test('Park Manager can generate an Incident Report through the protected API', async (t) => {
  const incidents = selectFixtureIncidents(septemberYalaParameters);
  const reports = {
    async create(report) { return report; },
    async findByReportIdForManager() { return null; },
  };
  const app = createApp({
    clientOrigin, isDatabaseConnected: () => true, jwtSecret, jwtExpiresIn: '24h',
    users: { findById: async () => ({ id: managerId, role: PARK_MANAGER }) },
    conservationReports: reports,
    incidentReportSources: { findForReport: async () => incidents },
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const token = createAuthToken({ id: managerId, role: PARK_MANAGER }, jwtSecret, '24h');
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/conservation-reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', Origin: clientOrigin,
      Cookie: `${AUTH_TOKEN_COOKIE}=${token}`,
    },
    body: JSON.stringify({
      reportType: CONSERVATION_REPORT_TYPES.INCIDENT,
      startDate: '2026-09-01', endDate: '2026-09-30',
      filters: { park: 'Yala National Park' },
    }),
  });

  assert.equal(response.status, 201);
  const payload = await response.json();
  assert.equal(payload.noData, false);
  assert.equal(payload.report.results.summary.totalIncidents, 2);
  assert.match(payload.report.reportId, /^CR-2026-[A-F0-9]{10}$/);
});

function selectFixtureIncidents(parameters) {
  return reportSourceIncidents.filter((incident) => {
    const occurredAt = new Date(incident.occurredAt);
    return occurredAt >= parameters.startDate
      && occurredAt <= parameters.endDate
      && (!parameters.filters.park || incident.park === parameters.filters.park);
  });
}
