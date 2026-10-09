import { useRef, useState } from 'react';
import FormAlert from '../../auth/components/FormAlert.jsx';
import ReportLayout from '../components/ReportLayout.jsx';
import SubmissionOverlay from '../components/SubmissionOverlay.jsx';
import { useReportDraft } from '../context/useReportDraft.js';
import { submitReport } from '../services/report.service.js';
import { reportTypeLabel } from '../utils/report-options.js';
import CommunityIcon from '../components/CommunityIcon.jsx';
import ReviewAttachments from '../components/ReviewAttachments.jsx';
import { evidenceFileKey, validateEvidenceSelection } from '../validation/evidence.validation.js';
import { hasCompleteCommunityReportDetails } from '../context/community-report-draft.storage.js';
import { parseIncidentDateTime } from '../validation/incidentDateTime.validation.js';
import './review-report.css';

const locationSourceLabel = { GPS: 'Current GPS location', MAP: 'Selected on map', MANUAL: 'Entered manually' };

export default function ReviewReportPage({ navigate }) {
  const { draft, setSubmittedReport, clearDraft, setEvidence, continueWithoutEvidence, evidenceHydrationStatus, evidenceRestoreError } = useReportDraft();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const submissionLock = useRef(false);
  const incidentDate = parseIncidentDateTime(draft.incidentDateTime);
  const incidentDateLabel = incidentDate
    ? new Intl.DateTimeFormat('en-LK', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(incidentDate)
    : 'Incident date and time is required.';
  const coordinates = draft.location.coordinates;
  const readableLocation = draft.location.displayName?.trim() || draft.location.manualLocation?.trim();
  const locationText = readableLocation
    || (Number.isFinite(coordinates?.latitude) && Number.isFinite(coordinates?.longitude)
      ? `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}` : 'Location not available');
  const isRestoring = evidenceHydrationStatus === 'idle' || evidenceHydrationStatus === 'loading';
  const evidenceReady = evidenceHydrationStatus === 'ready' && !draft.evidenceRestoreRequired;
  const validFiles = draft.evidence.every((file) => file instanceof File)
    && validateEvidenceSelection(draft.evidence, []).messages.length === 0;
  const validDraft = hasCompleteCommunityReportDetails(draft) && validFiles;
  const canSubmit = confirmed && validDraft && evidenceReady && !isSubmitting;

  function removeEvidence(file) {
    if (submissionLock.current || !evidenceReady) return;
    setEvidence(draft.evidence.filter((item) => evidenceFileKey(item) !== evidenceFileKey(file)));
  }

  async function submit(event) {
    event.preventDefault();
    if (submissionLock.current) return;
    if (!confirmed) return setError('Please confirm that the information provided is accurate and complete.');
    if (!validDraft) return setError('Please check your report details and evidence before submitting.');
    if (!evidenceReady) return setError(isRestoring ? 'Please wait for attached evidence to finish restoring.' : 'Please select your evidence again or continue without evidence.');
    submissionLock.current = true;
    setIsSubmitting(true); setError('');
    try {
      const report = await submitReport(draft);
      setSubmittedReport(report);
      clearDraft();
      navigate('/reports/confirmation');
    }
    catch (requestError) { setError(requestError.message); }
    finally { submissionLock.current = false; setIsSubmitting(false); }
  }
  return <ReportLayout navigate={navigate} className="community-review" title="Review & Submit" subtitle="Review your report carefully before submitting it to WildGuard." step={4}>
    <form className="community-review__form" onSubmit={submit} noValidate aria-busy={isSubmitting}>
      <FormAlert>{error}</FormAlert>
      <fieldset className="community-review__fields" disabled={isSubmitting}>
        <legend className="sr-only">Review report details and confirm submission</legend>
        <div className="community-review__grid">
          <div className="review-summary-panel">
            <SummaryRow icon="document" label="Report Type" value={reportTypeLabel(draft.reportType)} onEdit={() => navigate('/reports/type')} editLabel="Edit report type" />
            <SummaryRow icon="calendar" label="Incident Date & Time" value={incidentDateLabel} onEdit={() => navigate('/reports/details')} editLabel="Edit incident date and time" />
            <SummaryRow icon="pin" label="Location" value={locationText} badge={locationSourceLabel[draft.location.source]} onEdit={() => navigate('/reports/details')} editLabel="Edit location" />
          </div>
          <div className="community-review__details-panel">
            <section className="review-description" aria-labelledby="review-description-title">
              <div className="community-review__section-heading"><h2 id="review-description-title">Description</h2><button type="button" className="community-review__edit" aria-label="Edit description" onClick={() => navigate('/reports/details')}><CommunityIcon name="edit" /></button></div>
              <div className="review-description__text" tabIndex={0} role="region" aria-label="Incident description">{draft.description}</div>
            </section>
            <ReviewAttachments files={draft.evidence} isRestoring={isRestoring} recoveryRequired={draft.evidenceRestoreRequired || evidenceHydrationStatus === 'failed'} warning={evidenceRestoreError} onEdit={() => navigate('/reports/evidence')} onRemove={removeEvidence} onSkip={continueWithoutEvidence} />
          </div>
        </div>
        <label className="review-confirmation" htmlFor="review-accuracy">
          <input id="review-accuracy" type="checkbox" checked={confirmed} onChange={(event) => { setConfirmed(event.target.checked); setError(''); }} />
          <span className="review-confirmation__check" aria-hidden="true"><CommunityIcon name="check" /></span>
          <span>I confirm that the information provided is accurate and complete.</span>
        </label>
        <div className="review-actions"><button type="button" className="secondary-button" onClick={() => navigate('/reports/evidence')}>Back</button><button type="submit" className="primary-button" disabled={!canSubmit}>{isSubmitting ? 'Submitting report…' : 'Submit Report'}</button></div>
      </fieldset>
    </form>
    {isSubmitting && <SubmissionOverlay />}
  </ReportLayout>;
}

function SummaryRow({ icon, label, value, badge, onEdit, editLabel }) {
  return <section className="review-summary-row">
    <span className="review-summary-row__icon"><CommunityIcon name={icon} size={32} /></span>
    <div className="review-summary-row__content"><h2>{label}</h2><p>{value}</p>{badge && <span className="review-summary-row__badge">{badge}</span>}</div>
    <button type="button" className="community-review__edit" onClick={onEdit} aria-label={editLabel}><CommunityIcon name="edit" /></button>
  </section>;
}
