import { fieldIncidentTypeLabel } from '../utils/field-incident-options.js';
import { formatFieldIncidentDateTime } from '../utils/field-incident-format.js';
import FieldIncidentStatusBadge, { FieldIncidentRiskBadge } from './FieldIncidentStatusBadge.jsx';

export default function FieldIncidentTable({ incidents, onView }) {
  return (
    <section className="field-incidents-table-card" aria-label="Your field incidents">
      <div className="field-incidents-table-heading">
        <h2>Incident records</h2>
        <span>{incidents.length} {incidents.length === 1 ? 'incident' : 'incidents'}</span>
      </div>
      <div className="field-incidents-table-scroll" tabIndex={0} aria-label="Scrollable incident table">
        <table className="field-incidents-table">
          <thead>
            <tr>
              <th scope="col">Reference</th>
              <th scope="col">Incident Type</th>
              <th scope="col">Date &amp; Time</th>
              <th scope="col">Park / Area</th>
              <th scope="col">Risk Level</th>
              <th scope="col">Evidence</th>
              <th scope="col">Status</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((incident) => {
              const evidenceCount = incident.evidence?.length ?? 0;
              return (
                <tr key={incident.id}>
                  <td className="field-incidents-reference-cell">{incident.referenceNumber || 'Pending'}</td>
                  <td>{fieldIncidentTypeLabel(incident.incidentType)}</td>
                  <td>{formatFieldIncidentDateTime(incident.incidentDateTime)}</td>
                  <td>
                    <span>{incident.parkZone || 'Not provided'}</span>
                    {incident.blockArea && <small>{incident.blockArea}</small>}
                  </td>
                  <td><FieldIncidentRiskBadge riskLevel={incident.riskLevel} /></td>
                  <td>{evidenceCount} {evidenceCount === 1 ? 'file' : 'files'}</td>
                  <td><FieldIncidentStatusBadge status={incident.status} /></td>
                  <td>
                    <button className="field-incidents-view-button" type="button"
                      aria-label={`View incident ${incident.referenceNumber || 'pending synchronization'}`}
                      onClick={() => onView(incident)}>View</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
