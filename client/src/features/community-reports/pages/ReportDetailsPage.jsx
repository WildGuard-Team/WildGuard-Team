import { useState } from 'react';
import ReportLayout from '../components/ReportLayout.jsx';
import ReportProgress from '../components/ReportProgress.jsx';
import { useReportDraft } from '../context/useReportDraft.js';
import { validateDetails } from '../utils/report-options.js';

export default function ReportDetailsPage({ navigate }) {
  const { draft, updateDraft } = useReportDraft();
  const [errors, setErrors] = useState({});
  function update(event) { updateDraft({ [event.target.name]: event.target.value }); setErrors((current) => ({ ...current, [event.target.name]: '' })); }
  function continueToReview(event) {
    event.preventDefault();
    const nextErrors = validateDetails(draft); setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) navigate('/reports/review');
  }
  return <ReportLayout navigate={navigate} title="Incident Details & Location" subtitle="Provide the information currently supported by WildGuard." step={2}>
    <ReportProgress currentStep={2} />
    <form className="report-form" noValidate onSubmit={continueToReview}>
      <label className="form-field" htmlFor="description">Incident description <textarea id="description" name="description" value={draft.description} onChange={update} aria-invalid={Boolean(errors.description)} aria-describedby="description-hint" placeholder="Describe what you saw or what happened." /></label>
      <span id="description-hint" className={errors.description ? 'field-hint field-hint--error' : 'field-hint'}>{errors.description || `${draft.description.trim().length}/2,000 characters · minimum 10`}</span>
      <label className="form-field" htmlFor="manualLocation">Manual location <input id="manualLocation" name="manualLocation" value={draft.manualLocation} onChange={update} aria-invalid={Boolean(errors.manualLocation)} placeholder="e.g. Kegalle, Main Road" /></label>
      <span className={errors.manualLocation ? 'field-hint field-hint--error' : 'field-hint'}>{errors.manualLocation || `${draft.manualLocation.trim().length}/300 characters · minimum 3`}</span>
      <div className="report-actions"><button type="button" className="secondary-button" onClick={() => navigate('/reports/type')}>Back</button><button className="primary-button" type="submit">Continue</button></div>
    </form>
  </ReportLayout>;
}
