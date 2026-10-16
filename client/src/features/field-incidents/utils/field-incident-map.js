import { FIELD_INCIDENT_PENDING_SYNC } from '../config/field-incident.constants.js';
import { filterFieldIncidents } from '../services/field-incident-history.service.js';
import { hasValidFieldIncidentCoordinates } from './field-incident-location.js';

export function getIncidentMapPosition(incident) {
  const coordinates = incident?.location?.coordinates;
  if (!hasValidFieldIncidentCoordinates(coordinates)) return null;

  // The public API and local drafts store named latitude/longitude values.
  // Leaflet accepts them in this order; do not interpret GeoJSON coordinates.
  return [coordinates.latitude, coordinates.longitude];
}

export function getMappedFieldIncidents(incidents = []) {
  return incidents.filter((incident) => getIncidentMapPosition(incident) !== null);
}

export function filterIncidentMap(incidents = [], filters = {}) {
  return filterFieldIncidents(getMappedFieldIncidents(incidents), filters);
}

export function summarizeIncidentMap(incidents = []) {
  return incidents.reduce((counts, incident) => {
    if (getIncidentMapPosition(incident) === null) {
      counts.withoutGps += 1;
      return counts;
    }

    counts.mapped += 1;
    if (incident.riskLevel === 'HIGH') counts.highRisk += 1;
    if (incident.status === FIELD_INCIDENT_PENDING_SYNC) counts.pendingSync += 1;
    return counts;
  }, { mapped: 0, highRisk: 0, pendingSync: 0, withoutGps: 0 });
}

export function incidentMapKey(incident) {
  if (incident?.clientIncidentId) return `client:${incident.clientIncidentId}`;
  if (incident?.id) return `id:${incident.id}`;
  return null;
}
