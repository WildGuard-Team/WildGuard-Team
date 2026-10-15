import FieldIncidentStatusBadge, { FieldIncidentRiskBadge } from '../../field-incidents/components/FieldIncidentStatusBadge.jsx';
import { formatFieldIncidentDateTime } from '../../field-incidents/utils/field-incident-format.js';
import { fieldIncidentTypeLabel } from '../../field-incidents/utils/field-incident-options.js';

export default function IncidentManagementTable({ incidents, onView }) {
  return (
    <div className="cr-table-scroll im-table-scroll" tabIndex={0} role="region" aria-label="Scrollable incident reports table">
      <table>
        <thead><tr>
          <th scope="col">Incident ID</th>
          <th scope="col">Ranger Name</th>
          <th scope="col">Incident Type</th>
          <th scope="col">Incident Date</th>
          <th scope="col">Park / Zone</th>
          <th scope="col">Block / Area</th>
          <th scope="col">Risk Level</th>
          <th scope="col">Status</th>
          <th scope="col">Actions</th>
        </tr></thead>
        <tbody>
          {incidents.map((incident) => (
            <tr key={incident.id}>
              <td className="im-reference">{incident.referenceNumber || incident.id}</td>
              <td>{incident.ranger?.fullName || 'Not available'}</td>
              <td>{fieldIncidentTypeLabel(incident.incidentType) || 'Not provided'}</td>
              <td>{formatFieldIncidentDateTime(incident.incidentDateTime)}</td>
              <td>{incident.parkZone || 'Not provided'}</td>
              <td>{incident.blockArea || 'Not provided'}</td>
              <td><FieldIncidentRiskBadge riskLevel={incident.riskLevel} /></td>
              <td><FieldIncidentStatusBadge status={incident.status} /></td>
              <td><button type="button" className="field-incidents-view-button"
                aria-label={`View incident ${incident.referenceNumber || incident.id}`}
                onClick={() => onView(incident.id)}>View</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
