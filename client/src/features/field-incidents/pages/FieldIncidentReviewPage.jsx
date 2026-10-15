import { useRef, useState } from 'react';
import { useAuth } from '../../../context/useAuth.js';
import FormAlert from '../../auth/components/FormAlert.jsx';
import EvidencePreviewCard from '../../community-reports/components/EvidencePreviewCard.jsx';
import RangerLayout from '../components/RangerLayout.jsx';
import FieldIncidentReviewCard from '../components/FieldIncidentReviewCard.jsx';
import { useFieldIncidentDraft } from '../context/useFieldIncidentDraft.js';
import { fieldIncidentTypeLabel } from '../utils/field-incident-options.js';
import { formatFieldIncidentCoordinates } from '../utils/field-incident-location.js';
import { submitOrQueueFieldIncident } from '../services/field-incident-submission.service.js';

function formatRiskLevel(value) {
  return value ? value.charAt(0) + value.slice(1).toLowerCase() : 'Not provided';
}

export default function FieldIncidentReviewPage({ navigate }) {
  const { user } = useAuth();
  const { draft, setSubmittedIncident, clearDraft } = useFieldIncidentDraft();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionLock = useRef(false);

  async function submit() {
    if (submissionLock.current) return;
    submissionLock.current = true;
    setIsSubmitting(true);
    setError('');
    try {
      const { incident } = await submitOrQueueFieldIncident({ draft, ownerId: user?.id });
      setSubmittedIncident(incident);
      clearDraft();
      navigate('/ranger/incidents/confirmation');
    } catch (requestError) {
      setError(requestError.message || 'The field incident could not be submitted.');
    } finally {
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  }

  const sections = [
    { label: 'Incident Type', value: fieldIncidentTypeLabel(draft.incidentType), path: '/ranger/incidents/new' },
    { label: 'Date & Time', value: `${draft.incidentDate} at ${draft.incidentTime}` },
    { label: 'Risk Level', value: formatRiskLevel(draft.riskLevel) },
    { label: 'Park / Area', value: draft.parkZone + (draft.blockArea ? ` – ${draft.blockArea}` : '') },
  ];

  return (
    <RangerLayout navigate={navigate} active="report">
      <section className="report-workspace">
        <div className="report-heading">
          <div>
            <h1>Report Field Incident</h1>
            <p>Review the incident information before submitting the report.</p>
          </div>
          <p className="report-step">Step 4 of 4</p>
        </div>
        <FormAlert>{error}</FormAlert>
        <div className="review-list review-grid">
          {sections.map(({ label, value, path }) => (
            <FieldIncidentReviewCard key={label} label={label} disabled={isSubmitting}
              onEdit={() => navigate(path ?? '/ranger/incidents/details')}>
              <p>{value}</p>
            </FieldIncidentReviewCard>
          ))}
          <FieldIncidentReviewCard label="GPS Location" disabled={isSubmitting}
            onEdit={() => navigate('/ranger/incidents/details')}>
            <p>{formatFieldIncidentCoordinates(draft.location.coordinates)}</p>
            {draft.location.description && <p>{draft.location.description}</p>}
          </FieldIncidentReviewCard>
          <FieldIncidentReviewCard label="Incident Description" disabled={isSubmitting}
            onEdit={() => navigate('/ranger/incidents/details')}>
            <p>{draft.description}</p>
          </FieldIncidentReviewCard>
          {draft.additionalNotes && (
            <FieldIncidentReviewCard label="Additional Notes" disabled={isSubmitting}
              onEdit={() => navigate('/ranger/incidents/details')}>
              <p>{draft.additionalNotes}</p>
            </FieldIncidentReviewCard>
          )}
          <FieldIncidentReviewCard label="Evidence" className="review-evidence" disabled={isSubmitting}
            onEdit={() => navigate('/ranger/incidents/evidence')}>
            {draft.evidence.length === 0 ? <p>No evidence attached.</p> : (
              <div className="review-evidence-grid">
                {draft.evidence.map((file) => (
                  <EvidencePreviewCard key={`${file.name}-${file.size}-${file.lastModified}`} file={file} compact />
                ))}
              </div>
            )}
          </FieldIncidentReviewCard>
        </div>
        <div className="report-actions">
          <button type="button" className="secondary-button" disabled={isSubmitting}
            onClick={() => navigate('/ranger/incidents/evidence')}>Back</button>
          <button type="button" className="primary-button" disabled={isSubmitting} onClick={submit}>
            {isSubmitting ? 'Saving...' : 'Submit Report'}
          </button>
        </div>
      </section>
    </RangerLayout>
  );
}
