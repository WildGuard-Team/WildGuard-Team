import { CONSERVATION_REPORT_TYPES } from '../config/conservation-report.constants.js';
import { PATROL_STATUSES, SEEDED_DATA_PROVENANCE } from '../config/reporting-data.constants.js';
import {
  calculatePatrolCoverage, calculateRouteCoverageRows,
} from './patrol-coverage.service.js';

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

export function createPatrolCoverageReportStrategy(patrolSources) {
  return Object.freeze({
    reportType: CONSERVATION_REPORT_TYPES.PATROL_COVERAGE,
    async generate(parameters) {
      const [records, routeDefinitions] = await Promise.all([
        patrolSources.findPatrolRecords(parameters),
        patrolSources.findRouteDefinitions(parameters),
      ]);
      if (records.length === 0) return { hasData: false };
      return {
        hasData: true,
        results: aggregatePatrolCoverageReport(records, routeDefinitions, parameters),
        dataProvenance: collectProvenance(records, routeDefinitions),
      };
    },
  });
}

export function aggregatePatrolCoverageReport(records, routeDefinitions, { startDate, endDate }) {
  const routeNames = new Map(routeDefinitions.map((route) => [route.sourceId, route.name]));
  return {
    dataSource: {
      type: SEEDED_DATA_PROVENANCE,
      label: 'Based on seeded patrol data',
    },
    summary: calculatePatrolCoverage({ records, routeDefinitions }),
    breakdowns: {
      byRoute: calculateRouteCoverageRows({ records, routeDefinitions }),
      byStatus: PATROL_STATUSES.map((status) => ({
        label: status,
        count: records.filter((record) => record.status === status).length,
      })),
      byDate: buildDailyPatrolSeries(records, startDate, endDate),
    },
    patrols: records.map((record) => toPatrolRow(record, routeNames)),
  };
}

function buildDailyPatrolSeries(records, startDate, endDate) {
  const counts = new Map();
  for (const record of records) {
    const label = new Date(record.startedAt).toISOString().slice(0, 10);
    const current = counts.get(label) ?? { totalPatrols: 0, completedPatrols: 0, distanceKm: 0 };
    current.totalPatrols += 1;
    if (record.status === 'COMPLETED') {
      current.completedPatrols += 1;
      current.distanceKm += record.distanceKm;
    }
    counts.set(label, current);
  }

  const series = [];
  const cursor = startOfUtcDay(startDate);
  const lastDate = startOfUtcDay(endDate);
  while (cursor <= lastDate) {
    const label = cursor.toISOString().slice(0, 10);
    const values = counts.get(label) ?? { totalPatrols: 0, completedPatrols: 0, distanceKm: 0 };
    series.push({ label, ...values, distanceKm: round(values.distanceKm) });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return series;
}

function toPatrolRow(record, routeNames) {
  return {
    sourceId: record.sourceId,
    routeSourceId: record.routeSourceId,
    routeName: routeNames.get(record.routeSourceId) ?? record.routeSourceId,
    park: record.park,
    rangerTeam: record.rangerTeam,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
    status: record.status,
    distanceKm: record.distanceKm,
    durationHours: round((new Date(record.endedAt) - new Date(record.startedAt)) / MILLISECONDS_PER_HOUR),
    zonesCovered: record.zonesCovered,
    observations: record.observations,
  };
}

function collectProvenance(records, routes) {
  return [...new Set([...records, ...routes].map((item) => item.dataProvenance))];
}

function startOfUtcDay(value) {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function round(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
