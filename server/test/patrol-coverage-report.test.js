import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { AUTH_TOKEN_COOKIE, PARK_MANAGER } from '../src/modules/auth/config/auth.constants.js';
import { createAuthToken } from '../src/modules/auth/utils/token.js';
import { CONSERVATION_REPORT_TYPES } from '../src/modules/conservation-reports/config/conservation-report.constants.js';
import {
  buildPatrolRecordQuery, buildPatrolRouteQuery,
} from '../src/modules/conservation-reports/repositories/patrol-report-source.repository.js';
import {
  patrolRecords, patrolRoutes,
} from '../src/modules/conservation-reports/seeds/reporting-source-data.js';
import {
  createPatrolCoverageReportStrategy,
} from '../src/modules/conservation-reports/services/patrol-coverage-report.strategy.js';
import { selectPatrolCoverageData } from '../src/modules/conservation-reports/services/patrol-coverage.service.js';

const clientOrigin = 'http://localhost:3000';
const jwtSecret = 'a-test-secret-that-is-longer-than-thirty-two-characters';
const managerId = new mongoose.Types.ObjectId().toString();
const yalaParameters = {
  reportType: CONSERVATION_REPORT_TYPES.PATROL_COVERAGE,
  startDate: new Date('2026-09-01T01:00:00.000Z'),
  endDate: new Date('2026-09-05T02:00:00.000Z'),
  filters: { park: 'Yala National Park' },
};

test('patrol repository queries use inclusive dates and applicable filters', () => {
  const parameters = {
    ...yalaParameters,
    filters: {
      park: 'Yala National Park',
      routeSourceIds: ['WG-ROUTE-YA-NORTH'],
      statuses: ['COMPLETED'],
    },
  };
  const recordQuery = buildPatrolRecordQuery(parameters);
  const routeQuery = buildPatrolRouteQuery(parameters);

  assert.deepEqual(recordQuery.startedAt, {
    $gte: parameters.startDate, $lte: parameters.endDate,
  });
  assert.equal(recordQuery.park.test('yala national park'), true);
  assert.deepEqual(recordQuery.routeSourceId, { $in: ['WG-ROUTE-YA-NORTH'] });
  assert.deepEqual(recordQuery.status, { $in: ['COMPLETED'] });
  assert.equal(routeQuery.park.test('YALA NATIONAL PARK'), true);
  assert.deepEqual(routeQuery.sourceId, { $in: ['WG-ROUTE-YA-NORTH'] });
});

test('Patrol Coverage strategy calculates filtered totals, route coverage and chart data', async () => {
  const selection = selectFixturePatrolData(yalaParameters);
  const strategy = createPatrolCoverageReportStrategy({
    findPatrolRecords: async () => selection.records,
    findRouteDefinitions: async () => selection.routeDefinitions,
  });
  const generated = await strategy.generate(yalaParameters);
  const { results } = generated;

  assert.equal(generated.hasData, true);
  assert.deepEqual(generated.dataProvenance, ['SEEDED_ASSIGNMENT_DATA']);
  assert.equal(results.dataSource.label, 'Based on seeded patrol data');
  assert.deepEqual(results.summary, {
    totalPatrols: 4,
    completedPatrols: 3,
    cancelledPatrols: 1,
    totalDistanceKm: 52,
    totalPatrolHours: 12,
    routeCoveragePercent: 100,
    zoneCoveragePercent: 80,
    completionRatePercent: 75,
    averageDistanceKm: 17.33,
    averagePatrolHours: 4,
    observations: 9,
  });

  const north = results.breakdowns.byRoute.find((route) => route.routeSourceId === 'WG-ROUTE-YA-NORTH');
  assert.deepEqual(north, {
    routeSourceId: 'WG-ROUTE-YA-NORTH',
    routeName: 'Northern Boundary Route',
    park: 'Yala National Park',
    totalPatrols: 3,
    completedPatrols: 2,
    distanceKm: 40,
    patrolHours: 9,
    zonesCovered: 3,
    zonesDefined: 3,
    zoneCoveragePercent: 100,
  });
  assert.deepEqual(results.breakdowns.byStatus, [
    { label: 'COMPLETED', count: 3 },
    { label: 'CANCELLED', count: 1 },
  ]);
  assert.equal(results.breakdowns.byDate.length, 5);
  assert.equal(sumBy(results.breakdowns.byDate, 'totalPatrols'), 4);
  assert.equal(sumBy(results.breakdowns.byDate, 'distanceKm'), 52);
  assert.equal(results.patrols.length, results.summary.totalPatrols);
});

test('Patrol Coverage strategy returns no data and does not invent coverage', async () => {
  const strategy = createPatrolCoverageReportStrategy({
    findPatrolRecords: async () => [],
    findRouteDefinitions: async () => patrolRoutes.filter((route) => route.park === 'Yala National Park'),
  });
  const generated = await strategy.generate(yalaParameters);
  assert.deepEqual(generated, { hasData: false });
});

test('Park Manager can generate a persisted Patrol Coverage Report through the API', async (t) => {
  const selection = selectFixturePatrolData(yalaParameters);
  const reports = {
    async create(report) { return report; },
    async findByReportIdForManager() { return null; },
  };
  const app = createApp({
    clientOrigin, isDatabaseConnected: () => true, jwtSecret, jwtExpiresIn: '24h',
    users: { findById: async () => ({ id: managerId, role: PARK_MANAGER }) },
    conservationReports: reports,
    patrolReportSources: {
      findPatrolRecords: async () => selection.records,
      findRouteDefinitions: async () => selection.routeDefinitions,
    },
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
      reportType: CONSERVATION_REPORT_TYPES.PATROL_COVERAGE,
      startDate: '2026-09-01', endDate: '2026-09-05',
      filters: { park: 'Yala National Park' },
    }),
  });

  assert.equal(response.status, 201);
  const payload = await response.json();
  assert.equal(payload.report.results.summary.totalPatrols, 4);
  assert.equal(payload.report.results.summary.totalDistanceKm, 52);
  assert.equal(payload.report.results.dataSource.type, 'SEEDED_ASSIGNMENT_DATA');
});

function selectFixturePatrolData(parameters) {
  return selectPatrolCoverageData({
    records: patrolRecords,
    routeDefinitions: patrolRoutes,
    filters: {
      ...parameters.filters,
      startDate: parameters.startDate,
      endDate: parameters.endDate,
    },
  });
}

function sumBy(records, field) {
  return records.reduce((total, record) => total + record[field], 0);
}
