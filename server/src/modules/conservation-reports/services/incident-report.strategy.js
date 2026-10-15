import { CONSERVATION_REPORT_TYPES } from '../config/conservation-report.constants.js';
import {
  buildCountTimeSeries, countBy, inclusiveDays, roundMetric, selectTimeGranularity,
} from '../utils/report-aggregation.js';

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
  const byTime = buildCountTimeSeries(incidents, {
    startDate, endDate, granularity: timeGranularity,
    dateOf: (incident) => incident.occurredAt,
  });
  const totalIncidents = incidents.length;
  const rangeDays = inclusiveDays(startDate, endDate);

  return {
    summary: {
      totalIncidents,
      distinctLocations: new Set(incidents.map((incident) => incident.location)).size,
      highSeverityIncidents: incidents.filter((incident) => incident.severity === 'HIGH').length,
      criticalIncidents: incidents.filter((incident) => incident.severity === 'CRITICAL').length,
      averageIncidentsPerDay: roundMetric(totalIncidents / rangeDays),
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
