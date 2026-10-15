import { FIELD_INCIDENT_PENDING_SYNC, FIELD_INCIDENT_SUBMITTED } from '../config/field-incident.constants.js';

export function normalizePendingFieldIncident(record) {
  const draft = record.draft ?? {};
  const date = draft.incidentDate && draft.incidentTime
    ? new Date(`${draft.incidentDate}T${draft.incidentTime}:00`)
    : null;

  return {
    id: `pending:${record.clientIncidentId}`,
    referenceNumber: null,
    clientIncidentId: record.clientIncidentId,
    incidentType: draft.incidentType,
    incidentDateTime: !date || Number.isNaN(date.getTime()) ? null : date.toISOString(),
    riskLevel: draft.riskLevel,
    parkZone: draft.parkZone ?? '',
    blockArea: draft.blockArea ?? '',
    location: draft.location ?? { source: null, coordinates: null, description: '' },
    description: draft.description ?? '',
    additionalNotes: draft.additionalNotes ?? '',
    evidence: draft.evidence ?? [],
    status: FIELD_INCIDENT_PENDING_SYNC,
    createdAt: record.createdAt,
    syncAttempts: record.syncAttempts ?? 0,
    lastAttemptAt: record.lastAttemptAt ?? null,
    lastError: record.lastError ?? null,
  };
}

export function mergeFieldIncidents(submitted, pending, ownerId) {
  const incidents = [...submitted];
  const clientIds = new Set(submitted.map((incident) => incident.clientIncidentId).filter(Boolean));

  for (const record of pending) {
    if (record.status !== FIELD_INCIDENT_PENDING_SYNC) continue;
    if (ownerId && record.ownerId !== ownerId) continue;
    if (clientIds.has(record.clientIncidentId)) continue;
    incidents.push(normalizePendingFieldIncident(record));
    if (record.clientIncidentId) clientIds.add(record.clientIncidentId);
  }

  return incidents;
}

function incidentTimestamp(incident) {
  const incidentTime = Date.parse(incident.incidentDateTime);
  if (!Number.isNaN(incidentTime)) return incidentTime;
  return Date.parse(incident.createdAt) || 0;
}

export function filterFieldIncidents(incidents, {
  status = 'ALL',
  incidentType = 'ALL',
  riskLevel = 'ALL',
  search = '',
  sort = 'NEWEST',
} = {}) {
  const query = search.trim().toLowerCase();
  const matches = incidents.filter((incident) => (
    (status === 'ALL' || incident.status === status)
    && (incidentType === 'ALL' || incident.incidentType === incidentType)
    && (riskLevel === 'ALL' || incident.riskLevel === riskLevel)
    && (!query || [incident.referenceNumber, incident.parkZone, incident.blockArea, incident.description]
      .some((value) => String(value ?? '').toLowerCase().includes(query)))
  ));

  return matches.sort((first, second) => (
    (incidentTimestamp(first) - incidentTimestamp(second)) * (sort === 'OLDEST' ? 1 : -1)
  ));
}

export function summarizeFieldIncidents(incidents) {
  return incidents.reduce((counts, incident) => {
    if (incident.status === FIELD_INCIDENT_SUBMITTED) counts.submitted += 1;
    if (incident.status === FIELD_INCIDENT_PENDING_SYNC) counts.pendingSync += 1;
    if (incident.riskLevel === 'HIGH') counts.highRisk += 1;
    return counts;
  }, { total: incidents.length, submitted: 0, pendingSync: 0, highRisk: 0 });
}
