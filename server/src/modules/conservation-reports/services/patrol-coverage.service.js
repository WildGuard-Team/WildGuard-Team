import { PATROL_METRIC_PRECISION } from '../config/reporting-data.constants.js';

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

export function selectPatrolCoverageData({ records, routeDefinitions, filters = {} }) {
  const selectedRoutes = routeDefinitions.filter((route) => matchesRoute(route, filters));
  const selectedRouteIds = new Set(selectedRoutes.map((route) => route.sourceId));
  const selectedRecords = records.filter((record) => (
    selectedRouteIds.has(record.routeSourceId)
    && matchesDateRange(record, filters)
    && matchesStatuses(record, filters)
  ));
  return { records: selectedRecords, routeDefinitions: selectedRoutes };
}

export function calculatePatrolCoverage({ records, routeDefinitions }) {
  const completed = records.filter((record) => record.status === 'COMPLETED');
  const completedRouteIds = new Set(completed.map((record) => record.routeSourceId));
  const definedZones = new Set(routeDefinitions.flatMap((route) => route.zones));
  const coveredZones = new Set(completed.flatMap((record) => record.zonesCovered));
  const totalDistanceKm = sum(completed, (record) => record.distanceKm);
  const totalPatrolHours = sum(completed, durationHours);

  return {
    totalPatrols: records.length,
    completedPatrols: completed.length,
    cancelledPatrols: records.filter((record) => record.status === 'CANCELLED').length,
    totalDistanceKm: round(totalDistanceKm),
    totalPatrolHours: round(totalPatrolHours),
    routeCoveragePercent: percentage(completedRouteIds.size, routeDefinitions.length),
    zoneCoveragePercent: percentage(coveredZones.size, definedZones.size),
    completionRatePercent: percentage(completed.length, records.length),
    averageDistanceKm: average(totalDistanceKm, completed.length),
    averagePatrolHours: average(totalPatrolHours, completed.length),
    observations: sum(completed, (record) => record.observations),
  };
}

function matchesRoute(route, filters) {
  if (filters.park && route.park !== filters.park) return false;
  if (filters.routeSourceIds?.length && !filters.routeSourceIds.includes(route.sourceId)) return false;
  return true;
}

function matchesDateRange(record, filters) {
  const startedAt = new Date(record.startedAt).getTime();
  if (filters.startDate && startedAt < new Date(filters.startDate).getTime()) return false;
  if (filters.endDate && startedAt > new Date(filters.endDate).getTime()) return false;
  return true;
}

function matchesStatuses(record, filters) {
  return !filters.statuses?.length || filters.statuses.includes(record.status);
}

function durationHours(record) {
  return (new Date(record.endedAt).getTime() - new Date(record.startedAt).getTime()) / MILLISECONDS_PER_HOUR;
}

function sum(records, valueOf) {
  return records.reduce((total, record) => total + valueOf(record), 0);
}

function percentage(numerator, denominator) {
  return denominator === 0 ? 0 : round((numerator / denominator) * 100);
}

function average(total, count) {
  return count === 0 ? 0 : round(total / count);
}

function round(value) {
  const factor = 10 ** PATROL_METRIC_PRECISION;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
