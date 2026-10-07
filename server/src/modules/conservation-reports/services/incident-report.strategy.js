import { CONSERVATION_REPORT_TYPES } from '../config/conservation-report.constants.js';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function createIncidentReportStrategy(incidentSources) {
  return Object.freeze({
    reportType: CONSERVATION_REPORT_TYPES.INCIDENT,
    async generate(parameters) {
      const incidents = await incidentSources.findForReport(parameters);
      if (incidents.length === 0) return { hasData: false };
      return {
        hasData: true,
        results: aggregateIncidentReport(incidents, parameters),
        dataProvenance: [...new Set(incidents.map((incident) => incident.dataProvenance))],
      };
    },
  });
}

export function aggregateIncidentReport(incidents, { startDate, endDate }) {
  const timeGranularity = selectTimeGranularity(startDate, endDate);
  const byTime = buildTimeSeries(incidents, startDate, endDate, timeGranularity);
  const totalIncidents = incidents.length;
  const rangeDays = Math.floor((endDate.getTime() - startDate.getTime()) / MILLISECONDS_PER_DAY) + 1;

  return {
    summary: {
      totalIncidents,
      distinctLocations: new Set(incidents.map((incident) => incident.location)).size,
      highSeverityIncidents: incidents.filter((incident) => incident.severity === 'HIGH').length,
      criticalIncidents: incidents.filter((incident) => incident.severity === 'CRITICAL').length,
      averageIncidentsPerDay: round(totalIncidents / rangeDays),
    },
    timeGranularity,
    breakdowns: {
      byType: countBy(incidents, (incident) => incident.incidentType),
      byLocation: countBy(incidents, (incident) => incident.location),
      bySeverity: countBy(incidents, (incident) => incident.severity),
      byTime,
    },
    incidents: incidents.map(toIncidentRow),
  };
}

function countBy(records, labelOf) {
  const counts = new Map();
  for (const record of records) {
    const label = labelOf(record);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function selectTimeGranularity(startDate, endDate) {
  const days = Math.floor((endDate.getTime() - startDate.getTime()) / MILLISECONDS_PER_DAY) + 1;
  if (days <= 45) return 'DAY';
  if (days <= 180) return 'WEEK';
  return 'MONTH';
}

function buildTimeSeries(incidents, startDate, endDate, granularity) {
  const counts = new Map();
  for (const incident of incidents) {
    const label = bucketLabel(new Date(incident.occurredAt), granularity);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const series = [];
  let cursor = bucketStart(startDate, granularity);
  const lastBucket = bucketStart(endDate, granularity);
  while (cursor <= lastBucket) {
    const label = bucketLabel(cursor, granularity);
    series.push({ label, count: counts.get(label) ?? 0 });
    cursor = nextBucket(cursor, granularity);
  }
  return series;
}

function bucketStart(value, granularity) {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  if (granularity === 'MONTH') date.setUTCDate(1);
  if (granularity === 'WEEK') {
    const daysFromMonday = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - daysFromMonday);
  }
  return date;
}

function nextBucket(value, granularity) {
  const date = new Date(value);
  if (granularity === 'MONTH') date.setUTCMonth(date.getUTCMonth() + 1);
  else date.setUTCDate(date.getUTCDate() + (granularity === 'WEEK' ? 7 : 1));
  return date;
}

function bucketLabel(value, granularity) {
  const date = bucketStart(value, granularity);
  const isoDate = date.toISOString().slice(0, 10);
  return granularity === 'MONTH' ? isoDate.slice(0, 7) : isoDate;
}

function toIncidentRow(incident) {
  return {
    sourceId: incident.sourceId,
    occurredAt: incident.occurredAt,
    park: incident.park,
    location: incident.location,
    incidentType: incident.incidentType,
    severity: incident.severity,
    species: incident.species ?? null,
  };
}

function round(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
