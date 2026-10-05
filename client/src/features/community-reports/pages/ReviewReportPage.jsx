import { useState } from 'react';
import FormAlert from '../../auth/components/FormAlert.jsx';
import ReportLayout from '../components/ReportLayout.jsx';
import ReportProgress from '../components/ReportProgress.jsx';
import SubmissionOverlay from '../components/SubmissionOverlay.jsx';
import { useReportDraft } from '../context/useReportDraft.js';
import { submitReport } from '../services/report.service.js';
import { reportTypeLabel } from '../utils/report-options.js';

export default function ReviewReportPage({ navigate }) {
  const { draft, setSubmittedReport } = useReportDraft();
  const [error, setError] = useState(''); const [isSubmitting, setIsSubmitting] = useState(false); const [confirmed, setConfirmed] = useState(false);
  async function submit() {
    if (isSubmitting) return;
    setIsSubmitting(true); setError('');
    try { setSubmittedReport(await submitReport(draft)); navigate('/reports/confirmation'); }
    catch (requestError) { setError(requestError.message); }
    finally { setIsSubmitting(false); }
  }
  return <ReportLayout navigate={navigate} title="Review & Submit" subtitle="Check your details before sending this report." step={3}>
    <ReportProgress currentStep={3} />
    <FormAlert>{error}</FormAlert>
    <div className="review-list review-grid">
      <section><div><h2>Report type</h2><p>{reportTypeLabel(draft.reportType)}</p></div><button type="button" onClick={() => navigate('/reports/type')}>Edit</button></section>
      <section><div><h2>Incident description</h2><p>{draft.description}</p></div><button type="button" onClick={() => navigate('/reports/details')}>Edit</button></section>
      <section><div><h2>Manual location</h2><p>{draft.manualLocation}</p></div><button type="button" onClick={() => navigate('/reports/details')}>Edit</button></section>
    </div>
    <label className="accuracy-confirmation"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> <span>I confirm the information in this report is accurate.</span></label>
    <div className="report-actions"><button type="button" className="secondary-button" onClick={() => navigate('/reports/details')} disabled={isSubmitting}>Back</button><button type="button" className="primary-button" onClick={submit} disabled={isSubmitting || !confirmed}>{isSubmitting ? 'Submitting report…' : 'Submit report'}</button></div>
    {isSubmitting && <SubmissionOverlay />}
  </ReportLayout>;
}
