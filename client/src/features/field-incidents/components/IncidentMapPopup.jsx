import { FIELD_INCIDENT_PENDING_SYNC } from '../config/field-incident.constants.js';
import { formatFieldIncidentDateTime } from '../utils/field-incident-format.js';
import { fieldIncidentTypeLabel } from '../utils/field-incident-options.js';
import FieldIncidentStatusBadge, { FieldIncidentRiskBadge } from './FieldIncidentStatusBadge.jsx';

export default function IncidentMapPopup({ incident, onViewIncident }) {
  const pending = incident.status === FIELD_INCIDENT_PENDING_SYNC;
  return (
    <article className="ranger-map-popup">
      <p className="ranger-map-popup-reference">
        {pending ? 'Pending synchronization' : incident.referenceNumber || 'Reference not assigned'}
      </p>
      <h3>{fieldIncidentTypeLabel(incident.incidentType) || 'Field incident'}</h3>
      <div className="ranger-map-popup-badges">
        <FieldIncidentStatusBadge status={incident.status} />
        <FieldIncidentRiskBadge riskLevel={incident.riskLevel} />
      </div>
      <dl>
        <div><dt>Park / Zone</dt><dd>{incident.parkZone || 'Not provided'}</dd></div>
        <div><dt>Block / Area</dt><dd>{incident.blockArea || 'Not provided'}</dd></div>
        <div><dt>Date &amp; Time</dt><dd>{formatFieldIncidentDateTime(incident.incidentDateTime)}</dd></div>
      </dl>
      <button type="button" className="ranger-map-popup-view" onClick={() => onViewIncident?.(incident)}>
        View Incident
      </button>
    </article>
  );
}
