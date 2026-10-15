import assert from 'node:assert/strict';
import test from 'node:test';
import {
  REPORTING_DATASET_ID, SEEDED_DATA_PROVENANCE,
} from '../src/modules/conservation-reports/config/reporting-data.constants.js';
import { reportingSourceData } from '../src/modules/conservation-reports/seeds/reporting-source-data.js';
import {
  calculatePatrolCoverage, selectPatrolCoverageData,
} from '../src/modules/conservation-reports/services/patrol-coverage.service.js';
import { seedReportingData } from '../src/modules/conservation-reports/services/seed-reporting-data.service.js';

test('all reporting fixtures have stable identifiers and explicit seeded-data provenance', () => {
  const allRecords = [
    ...reportingSourceData.incidents,
    ...reportingSourceData.routes,
    ...reportingSourceData.patrols,
  ];
  assert.equal(new Set(allRecords.map((record) => record.sourceId)).size, allRecords.length);
  for (const record of allRecords) {
    assert.equal(record.dataProvenance, SEEDED_DATA_PROVENANCE);
    assert.equal(record.datasetId, REPORTING_DATASET_ID);
  }
});

test('seed service remains idempotent when its upsert repository is run repeatedly', async () => {
  const stores = { incidents: new Map(), routes: new Map(), patrols: new Map() };
  const repository = createMemorySeedRepository(stores);

  await seedReportingData(repository);
  const firstCounts = Object.fromEntries(Object.entries(stores).map(([name, store]) => [name, store.size]));
  await seedReportingData(repository);
  const secondCounts = Object.fromEntries(Object.entries(stores).map(([name, store]) => [name, store.size]));

  assert.deepEqual(secondCounts, firstCounts);
  assert.deepEqual(firstCounts, {
    incidents: reportingSourceData.incidents.length,
    routes: reportingSourceData.routes.length,
    patrols: reportingSourceData.patrols.length,
  });
});

test('patrol selection applies inclusive date boundaries and park scope', () => {
  const selection = selectPatrolCoverageData({
    records: reportingSourceData.patrols,
    routeDefinitions: reportingSourceData.routes,
    filters: {
      park: 'Yala National Park',
      startDate: '2026-09-01T01:00:00.000Z',
      endDate: '2026-09-05T02:00:00.000Z',
    },
  });

  assert.deepEqual(selection.records.map((record) => record.sourceId), [
    'WG-PATROL-001', 'WG-PATROL-002', 'WG-PATROL-003', 'WG-PATROL-004',
  ]);
  assert.equal(selection.routeDefinitions.length, 2);
});

test('patrol coverage calculates totals, completion and actual route and zone coverage', () => {
  const selection = selectPatrolCoverageData({
    records: reportingSourceData.patrols,
    routeDefinitions: reportingSourceData.routes,
    filters: {
      park: 'Yala National Park',
      startDate: '2026-09-01T01:00:00.000Z',
      endDate: '2026-09-05T02:00:00.000Z',
    },
  });

  assert.deepEqual(calculatePatrolCoverage(selection), {
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
});

test('patrol coverage returns safe zero metrics when filters match no patrols', () => {
  const selection = selectPatrolCoverageData({
    records: reportingSourceData.patrols,
    routeDefinitions: reportingSourceData.routes,
    filters: { park: 'Yala National Park', startDate: '2030-01-01T00:00:00.000Z' },
  });
  const metrics = calculatePatrolCoverage(selection);

  assert.equal(metrics.totalPatrols, 0);
  assert.equal(metrics.totalDistanceKm, 0);
  assert.equal(metrics.routeCoveragePercent, 0);
  assert.equal(metrics.zoneCoveragePercent, 0);
  assert.equal(metrics.completionRatePercent, 0);
  assert.equal(metrics.averagePatrolHours, 0);
});

function createMemorySeedRepository(stores) {
  const upsert = (store) => async (records) => {
    for (const record of records) store.set(record.sourceId, record);
    return { matched: 0, modified: 0, inserted: records.length };
  };
  return {
    upsertIncidents: upsert(stores.incidents),
    upsertRoutes: upsert(stores.routes),
    upsertPatrols: upsert(stores.patrols),
  };
}
