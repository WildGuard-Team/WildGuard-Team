import { useState } from 'react';
import FormAlert from '../../auth/components/FormAlert.jsx';
import ReportLayout from '../components/ReportLayout.jsx';
import ReportProgress from '../components/ReportProgress.jsx';
import { useReportDraft } from '../context/useReportDraft.js';
import { submitReport } from '../services/report.service.js';
import { reportTypeLabel } from '../utils/report-options.js';

export default function ReviewReportPage({ navigate }) {
  const { draft, setSubmittedReport } = useReportDraft();
  const [error, setError] = useState(''); const [isSubmitting, setIsSubmitting] = useState(false);
  async function submit() {
    if (isSubmitting) return;
    setIsSubmitting(true); setError('');
    try { setSubmittedReport(await submitReport(draft)); navigate('/reports/confirmation'); }
    catch (requestError) { setError(requestError.message); }
    finally { setIsSubmitting(false); }
  }
  return <ReportLayout title="Review your report" step={3}>
    <ReportProgress currentStep={3} />
    <FormAlert>{error}</FormAlert>
    <div className="review-list">
      <section><div><h2>Report type</h2><p>{reportTypeLabel(draft.reportType)}</p></div><button type="button" onClick={() => navigate('/reports/type')}>Edit</button></section>
      <section><div><h2>Incident description</h2><p>{draft.description}</p></div><button type="button" onClick={() => navigate('/reports/details')}>Edit</button></section>
      <section><div><h2>Manual location</h2><p>{draft.manualLocation}</p></div><button type="button" onClick={() => navigate('/reports/details')}>Edit</button></section>
    </div>
    <div className="report-actions"><button type="button" className="secondary-button" onClick={() => navigate('/reports/details')} disabled={isSubmitting}>Back</button><button type="button" className="primary-button" onClick={submit} disabled={isSubmitting}>{isSubmitting ? 'Submitting report…' : 'Submit report'}</button></div>
  </ReportLayout>;
}
