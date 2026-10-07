import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { AUTH_TOKEN_COOKIE, PARK_MANAGER } from '../src/modules/auth/config/auth.constants.js';
import { createAuthToken } from '../src/modules/auth/utils/token.js';
import { CONSERVATION_REPORT_TYPES } from '../src/modules/conservation-reports/config/conservation-report.constants.js';
import { buildConflictQuery } from '../src/modules/conservation-reports/repositories/conflict-report-source.repository.js';
import { reportSourceIncidents } from '../src/modules/conservation-reports/seeds/reporting-source-data.js';
import {
  aggregateConflictTrendReport, createConflictTrendReportStrategy,
} from '../src/modules/conservation-reports/services/conflict-trend-report.strategy.js';

const clientOrigin = 'http://localhost:3000';
const jwtSecret = 'a-test-secret-that-is-longer-than-thirty-two-characters';
const managerId = new mongoose.Types.ObjectId().toString();
const conflictParameters = {
  reportType: CONSERVATION_REPORT_TYPES.CONFLICT_TREND,
  startDate: new Date('2026-08-01T00:00:00.000Z'),
  endDate: new Date('2026-09-30T23:59:59.999Z'),
  filters: {},
};

test('conflict query requires human-wildlife conflicts and applies all filters', () => {
  const parameters = {
    ...conflictParameters,
    filters: {
      park: 'Yala National Park', location: 'Buffer (North)',
      severities: ['HIGH'], conflictTypes: ['CROP_DAMAGE'],
    },
  };
  const query = buildConflictQuery(parameters);
  assert.equal(query.humanWildlifeConflict, true);
  assert.deepEqual(query.occurredAt, {
    $gte: parameters.startDate, $lte: parameters.endDate,
  });
  assert.equal(query.park.test('yala national park'), true);
  assert.equal(query.location.test('Buffer (North) Area'), true);
  assert.deepEqual(query.severity, { $in: ['HIGH'] });
  assert.deepEqual(query.conflictType, { $in: ['CROP_DAMAGE'] });
});

test('Conflict Trend aggregation calculates grouping, hotspots and trend direction', () => {
  const conflicts = createConflictFixtures();
  const results = aggregateConflictTrendReport(conflicts, conflictParameters);

  assert.deepEqual(results.summary, {
    totalConflicts: 5,
    distinctLocations: 4,
    highRiskConflicts: 4,
    criticalConflicts: 1,
    averageConflictsPerDay: 0.08,
    topHotspot: { label: 'Sithulpawwa Buffer Zone', count: 2 },
    trendDirection: 'INCREASING',
    trendChangePercent: 300,
  });
  assert.deepEqual(results.trend, {
    firstPeriodCount: 1,
    secondPeriodCount: 4,
    direction: 'INCREASING',
    changePercent: 300,
  });
  assert.deepEqual(results.breakdowns.byConflictType, [
    { label: 'CROP_DAMAGE', count: 3 },
    { label: 'HUMAN_INJURY', count: 1 },
    { label: 'PROPERTY_DAMAGE', count: 1 },
  ]);
  assert.deepEqual(results.breakdowns.bySpecies, [
    { label: 'Sri Lankan elephant', count: 4 },
    { label: 'Wild boar', count: 1 },
  ]);
  assert.equal(results.breakdowns.byTime.reduce((total, point) => total + point.count, 0), 5);
  assert.equal(results.conflicts.length, results.summary.totalConflicts);
});

test('Conflict Trend strategy returns provenance and a no-data state when appropriate', async () => {
  const conflicts = createConflictFixtures();
  const populated = createConflictTrendReportStrategy({ findForReport: async () => conflicts });
  const generated = await populated.generate(conflictParameters);
  assert.equal(generated.hasData, true);
  assert.deepEqual(generated.dataProvenance, ['SEEDED_ASSIGNMENT_DATA']);

  const empty = createConflictTrendReportStrategy({ findForReport: async () => [] });
  assert.deepEqual(await empty.generate(conflictParameters), { hasData: false });
});

test('conflict trend handles stable, decreasing and zero-baseline periods', () => {
  const parameters = {
    ...conflictParameters,
    startDate: new Date('2026-09-01T00:00:00.000Z'),
    endDate: new Date('2026-09-10T23:59:59.999Z'),
  };
  const base = createConflictFixtures()[0];
  const firstPeriod = { ...base, sourceId: 'FIRST', occurredAt: '2026-09-02T00:00:00.000Z' };
  const secondPeriod = { ...base, sourceId: 'SECOND', occurredAt: '2026-09-09T00:00:00.000Z' };

  const stable = aggregateConflictTrendReport([firstPeriod, secondPeriod], parameters).trend;
  assert.deepEqual(stable, {
    firstPeriodCount: 1, secondPeriodCount: 1, direction: 'STABLE', changePercent: 0,
  });
  const decreasing = aggregateConflictTrendReport([firstPeriod], parameters).trend;
  assert.deepEqual(decreasing, {
    firstPeriodCount: 1, secondPeriodCount: 0, direction: 'DECREASING', changePercent: -100,
  });
  const zeroBaseline = aggregateConflictTrendReport([secondPeriod], parameters).trend;
  assert.deepEqual(zeroBaseline, {
    firstPeriodCount: 0, secondPeriodCount: 1, direction: 'INCREASING', changePercent: null,
  });
});

test('Park Manager can generate a persisted Conflict Trend Report through the API', async (t) => {
  const conflicts = createConflictFixtures();
  const reports = {
    async create(report) { return report; },
    async findByReportIdForManager() { return null; },
  };
  const app = createApp({
    clientOrigin, isDatabaseConnected: () => true, jwtSecret, jwtExpiresIn: '24h',
    users: { findById: async () => ({ id: managerId, role: PARK_MANAGER }) },
    conservationReports: reports,
    conflictReportSources: { findForReport: async () => conflicts },
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
      reportType: CONSERVATION_REPORT_TYPES.CONFLICT_TREND,
      startDate: '2026-08-01', endDate: '2026-09-30', filters: {},
    }),
  });

  assert.equal(response.status, 201);
  const payload = await response.json();
  assert.equal(payload.report.results.summary.totalConflicts, 5);
  assert.equal(payload.report.results.summary.topHotspot.count, 2);
  assert.equal(payload.report.results.summary.trendDirection, 'INCREASING');
});

function createConflictFixtures() {
  const conflicts = reportSourceIncidents.filter((incident) => (
    incident.humanWildlifeConflict
    && new Date(incident.occurredAt) >= conflictParameters.startDate
    && new Date(incident.occurredAt) <= conflictParameters.endDate
  ));
  const repeatedHotspot = {
    ...conflicts.find((conflict) => conflict.sourceId === 'WG-EVT-006'),
    sourceId: 'WG-EVT-TEST-HOTSPOT',
    occurredAt: '2026-09-20T10:00:00.000Z',
  };
  return [...conflicts, repeatedHotspot];
}
