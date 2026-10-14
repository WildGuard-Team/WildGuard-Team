import { FIELD_INCIDENT_PENDING_SYNC, FIELD_INCIDENT_RISK_LEVELS, FIELD_INCIDENT_SUBMITTED } from '../config/field-incident.constants.js';

export default function FieldIncidentStatusBadge({ status }) {
  const pending = status === FIELD_INCIDENT_PENDING_SYNC;
  const submitted = status === FIELD_INCIDENT_SUBMITTED;
  return (
    <span className={`field-incident-status-badge${pending ? ' is-pending' : submitted ? ' is-submitted' : ''}`}>
      {pending ? 'PENDING SYNC' : submitted ? 'SUBMITTED' : 'Not available'}
    </span>
  );
}

export function FieldIncidentRiskBadge({ riskLevel }) {
  const supported = FIELD_INCIDENT_RISK_LEVELS.some(({ value }) => value === riskLevel);
  return (
    <span className={`field-incident-risk-badge${supported ? ` is-${riskLevel.toLowerCase()}` : ''}`}>
      {supported ? riskLevel : 'Not provided'}
    </span>
  );
}
