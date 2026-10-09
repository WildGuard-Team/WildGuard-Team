import { useEffect, useRef } from 'react';
import EvidencePreviewCard from '../../community-reports/components/EvidencePreviewCard.jsx';
import { FIELD_INCIDENT_PENDING_SYNC } from '../config/field-incident.constants.js';
import { fieldIncidentTypeLabel } from '../utils/field-incident-options.js';
import { formatFieldIncidentCoordinates } from '../utils/field-incident-location.js';
import { formatFieldIncidentDateTime } from '../utils/field-incident-format.js';
import FieldIncidentStatusBadge, { FieldIncidentRiskBadge } from './FieldIncidentStatusBadge.jsx';

function LocalBlobPreview({ file, name }) {
  const mediaRef = useRef(null);
  useEffect(() => {
    const media = mediaRef.current;
    const url = URL.createObjectURL(file);
    media.src = url;
    return () => {
      media.removeAttribute('src');
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return file.type.startsWith('video/')
    ? <video ref={mediaRef} controls preload="metadata" aria-label={`Preview ${name}`} />
    : <img ref={mediaRef} alt={`Preview of ${name}`} />;
}

function IncidentEvidence({ evidence }) {
  if (evidence.length === 0) return <p>No evidence attached.</p>;

  return (
    <div className="field-incident-details-evidence-grid">
      {evidence.map((item, index) => {
        const name = item.name || item.originalName || `Evidence ${index + 1}`;
        const localFile = typeof File !== 'undefined' && item instanceof File;
        const localBlob = typeof Blob !== 'undefined' && item instanceof Blob;
        const secureUrl = typeof item.secureUrl === 'string' && item.secureUrl.startsWith('https://')
          ? item.secureUrl : '';
        return (
          <figure key={`${item.publicId || name}-${index}`}>
            {localFile ? <EvidencePreviewCard file={item} compact /> : (
              <div className="field-incident-evidence-media">
                {localBlob ? <LocalBlobPreview file={item} name={name} /> : secureUrl ? (
                  item.resourceType === 'video'
                    ? <video src={secureUrl} controls preload="metadata" aria-label={`Preview ${name}`} />
                    : <img src={secureUrl} alt={`Preview of ${name}`} loading="lazy" />
                ) : <p>Preview unavailable.</p>}
              </div>
            )}
            <figcaption className="field-incident-evidence-caption">{name}</figcaption>
          </figure>
        );
      })}
    </div>
  );
}

function Detail({ label, children }) {
  return <div><dt>{label}</dt><dd>{children || 'Not provided'}</dd></div>;
}

export default function FieldIncidentDetailsModal({ incident, onClose }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  const pending = incident.status === FIELD_INCIDENT_PENDING_SYNC;
  const coordinates = incident.location?.coordinates;
  const hasCoordinates = Number.isFinite(coordinates?.latitude) && Number.isFinite(coordinates?.longitude);

  return (
    <dialog ref={dialogRef} className="field-incident-details-modal"
      aria-labelledby="field-incident-details-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="field-incident-details-header">
        <div>
          <p>FIELD INCIDENT</p>
          <h2 id="field-incident-details-title">Incident details</h2>
        </div>
        <button className="field-incident-details-close" type="button"
          onClick={onClose} aria-label="Close incident details">×</button>
      </div>
      <div className="field-incident-details-body">
        <dl className="field-incident-details-grid">
          <Detail label="Reference Number">{incident.referenceNumber || 'Not assigned'}</Detail>
          <Detail label="Status"><FieldIncidentStatusBadge status={incident.status} /></Detail>
          <Detail label="Incident Type">{fieldIncidentTypeLabel(incident.incidentType)}</Detail>
          <Detail label="Incident Date & Time">{formatFieldIncidentDateTime(incident.incidentDateTime)}</Detail>
          <Detail label="Risk Level"><FieldIncidentRiskBadge riskLevel={incident.riskLevel} /></Detail>
          <Detail label="Park / Zone">{incident.parkZone}</Detail>
          <Detail label="Block / Area">{incident.blockArea}</Detail>
          <Detail label="GPS Coordinates">
            {hasCoordinates ? formatFieldIncidentCoordinates(coordinates) : 'Not provided'}
          </Detail>
          <Detail label={pending ? 'Created time' : 'Submitted time'}>
            {formatFieldIncidentDateTime(incident.createdAt)}
          </Detail>
        </dl>
        <section className="field-incident-details-section">
          <h3>Location Description</h3>
          <p>{incident.location?.description || 'Not provided'}</p>
        </section>
        <section className="field-incident-details-section">
          <h3>Incident Description</h3>
          <p>{incident.description || 'Not provided'}</p>
        </section>
        <section className="field-incident-details-section">
          <h3>Additional Notes</h3>
          <p>{incident.additionalNotes || 'Not provided'}</p>
        </section>
        <section className="field-incident-details-section">
          <h3>Evidence</h3>
          <IncidentEvidence evidence={incident.evidence ?? []} />
        </section>
        {pending && (
          <section className="field-incident-details-section field-incident-details-sync">
            <h3>Synchronization</h3>
            <dl className="field-incident-details-grid">
              <Detail label="Status">Pending</Detail>
              <Detail label="Client incident ID">{incident.clientIncidentId}</Detail>
              <Detail label="Attempts">{String(incident.syncAttempts ?? 0)}</Detail>
              <Detail label="Last attempt">
                {incident.lastAttemptAt ? formatFieldIncidentDateTime(incident.lastAttemptAt) : 'Not attempted'}
              </Detail>
            </dl>
            {incident.lastError && (
              <p className="field-incident-details-error"><strong>Last error:</strong> {incident.lastError}</p>
            )}
          </section>
        )}
      </div>
    </dialog>
  );
}
