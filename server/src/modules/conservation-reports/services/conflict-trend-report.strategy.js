import { CONSERVATION_REPORT_TYPES } from '../config/conservation-report.constants.js';
import {
  buildCountTimeSeries, countBy, inclusiveDays, roundMetric, selectTimeGranularity,
} from '../utils/report-aggregation.js';

export function createConflictTrendReportStrategy(conflictSources) {
  return Object.freeze({
    reportType: CONSERVATION_REPORT_TYPES.CONFLICT_TREND,
    async generate(parameters) {
      const conflicts = await conflictSources.findForReport(parameters);
      if (conflicts.length === 0) return { hasData: false };
      return {
        hasData: true,
        results: aggregateConflictTrendReport(conflicts, parameters),
        dataProvenance: [...new Set(conflicts.map((conflict) => conflict.dataProvenance))],
      };
    },
  });
}

export function aggregateConflictTrendReport(conflicts, { startDate, endDate }) {
  const timeGranularity = selectTimeGranularity(startDate, endDate);
  const byLocation = countBy(conflicts, (conflict) => conflict.location);
  const totalConflicts = conflicts.length;
  const trend = calculateTrend(conflicts, startDate, endDate);

  return {
    summary: {
      totalConflicts,
      distinctLocations: byLocation.length,
      highRiskConflicts: conflicts.filter((conflict) => ['HIGH', 'CRITICAL'].includes(conflict.severity)).length,
      criticalConflicts: conflicts.filter((conflict) => conflict.severity === 'CRITICAL').length,
      averageConflictsPerDay: roundMetric(totalConflicts / inclusiveDays(startDate, endDate)),
      topHotspot: byLocation[0],
      trendDirection: trend.direction,
      trendChangePercent: trend.changePercent,
    },
    trend,
    timeGranularity,
    breakdowns: {
      byConflictType: countBy(conflicts, (conflict) => conflict.conflictType ?? 'NOT_RECORDED'),
      byLocation,
      bySeverity: countBy(conflicts, (conflict) => conflict.severity),
      bySpecies: countBy(conflicts, (conflict) => conflict.species ?? 'NOT_RECORDED'),
      byTime: buildCountTimeSeries(conflicts, {
        startDate, endDate, granularity: timeGranularity,
        dateOf: (conflict) => conflict.occurredAt,
      }),
    },
    conflicts: conflicts.map(toConflictRow),
  };
}

function calculateTrend(conflicts, startDate, endDate) {
  const midpoint = startDate.getTime() + ((endDate.getTime() - startDate.getTime()) / 2);
  const firstPeriodCount = conflicts.filter((conflict) => new Date(conflict.occurredAt).getTime() <= midpoint).length;
  const secondPeriodCount = conflicts.length - firstPeriodCount;
  let direction = 'STABLE';
  if (secondPeriodCount > firstPeriodCount) direction = 'INCREASING';
  if (secondPeriodCount < firstPeriodCount) direction = 'DECREASING';
  const changePercent = firstPeriodCount === 0
    ? null : roundMetric(((secondPeriodCount - firstPeriodCount) / firstPeriodCount) * 100);
  return { firstPeriodCount, secondPeriodCount, direction, changePercent };
}

function toConflictRow(conflict) {
  return {
    sourceId: conflict.sourceId,
    occurredAt: conflict.occurredAt,
    park: conflict.park,
    location: conflict.location,
    conflictType: conflict.conflictType ?? 'NOT_RECORDED',
    severity: conflict.severity,
    species: conflict.species ?? 'NOT_RECORDED',
  };
}
