import { FIELD_INCIDENT_SUBMITTED } from '../config/field-incident.constants.js';
import { summarizeFieldIncidents } from '../services/field-incident-history.service.js';

export function summarizeRangerDashboard(incidents, now = new Date()) {
  const { total, pendingSync } = summarizeFieldIncidents(incidents);
  const submittedToday = incidents.filter((incident) => {
    if (incident.status !== FIELD_INCIDENT_SUBMITTED) return false;
    const timestamp = Date.parse(incident.createdAt);
    if (!Number.isFinite(timestamp)) return false;
    const submittedAt = new Date(timestamp);
    return submittedAt.getFullYear() === now.getFullYear()
      && submittedAt.getMonth() === now.getMonth()
      && submittedAt.getDate() === now.getDate();
  }).length;

  return { total, submittedToday, pendingSync };
}
