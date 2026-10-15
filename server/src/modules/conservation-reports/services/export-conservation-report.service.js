import { CONSERVATION_REPORT_TYPES } from '../config/conservation-report.constants.js';

export function exportConservationReportCsv(report) {
  const rows = [
    ['WildGuard Conservation Report'],
    ['Report ID', report.reportId],
    ['Report Type', report.reportType],
    ['Start Date', toIsoDate(report.parameters.startDate)],
    ['End Date', toIsoDate(report.parameters.endDate)],
    ['Generated At', new Date(report.generatedAt).toISOString()],
    ['File Location', report.fileLocation],
    ['Data Provenance', report.dataProvenance],
    [],
    ['Applied Filters'],
    ['Filter', 'Value'],
    ...Object.entries(report.parameters.filters ?? {}),
    [],
    ['Summary Statistics'],
    ['Metric', 'Value'],
    ...Object.entries(report.results.summary ?? {}),
    [],
    ...detailRows(report),
  ];
  return `${rows.map(toCsvRow).join('\r\n')}\r\n`;
}

function detailRows(report) {
  if (report.reportType === CONSERVATION_REPORT_TYPES.INCIDENT) {
    return tableRows('Incident Records',
      ['Occurred At', 'Incident Type', 'Severity', 'Park', 'Location', 'Species'],
      report.results.incidents,
      (item) => [item.occurredAt, item.incidentType, item.severity, item.park, item.location, item.species]);
  }
  if (report.reportType === CONSERVATION_REPORT_TYPES.PATROL_COVERAGE) {
    return tableRows('Patrol Records',
      ['Started At', 'Route', 'Ranger Team', 'Status', 'Distance Km', 'Duration Hours', 'Zones'],
      report.results.patrols,
      (item) => [item.startedAt, item.routeName, item.rangerTeam, item.status, item.distanceKm, item.durationHours, item.zonesCovered]);
  }
  if (report.reportType === CONSERVATION_REPORT_TYPES.CONFLICT_TREND) {
    return tableRows('Conflict Records',
      ['Occurred At', 'Conflict Type', 'Severity', 'Park', 'Location', 'Species'],
      report.results.conflicts,
      (item) => [item.occurredAt, item.conflictType, item.severity, item.park, item.location, item.species]);
  }
  return [];
}

function tableRows(title, headers, records = [], mapRecord) {
  return [[title], headers, ...records.map(mapRecord)];
}

function toCsvRow(values) {
  return values.map((value) => `"${normalizeValue(value).replaceAll('"', '""')}"`).join(',');
}

function normalizeValue(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join('; ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function toIsoDate(value) {
  return new Date(value).toISOString().slice(0, 10);
}
