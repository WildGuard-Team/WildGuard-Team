import { useState } from 'react';
import ReportLayout from '../components/ReportLayout.jsx';
import EvidenceUploader from '../components/EvidenceUploader.jsx';
import { useReportDraft } from '../context/useReportDraft.js';

export default function ReportEvidencePage({ navigate }) {
  const { draft, updateDraft } = useReportDraft();
  const [isNavigating, setIsNavigating] = useState(false);
  function move(path, clearEvidence = false) {
    if (isNavigating) return;
    setIsNavigating(true);
    if (clearEvidence) updateDraft({ evidence: [] });
    navigate(path);
  }
  return <ReportLayout navigate={navigate} title="Optional Evidence" subtitle="Add photos or a short video to help verify your report. This step is optional." step={3}>
    <div className="evidence-panel">
      <EvidenceUploader files={draft.evidence} onChange={(evidence) => updateDraft({ evidence })} />
      <p className="evidence-information"><span aria-hidden="true">i</span> Evidence is optional. You can continue without uploading files.</p>
      <div className="evidence-actions"><button type="button" className="secondary-button" disabled={isNavigating} onClick={() => move('/reports/details')}>Back</button><button type="button" className="evidence-skip" disabled={isNavigating} onClick={() => move('/reports/review', true)}>Skip for now</button><button type="button" className="primary-button" disabled={isNavigating} onClick={() => move('/reports/review')}>Continue to Review</button></div>
    </div>
  </ReportLayout>;
}
