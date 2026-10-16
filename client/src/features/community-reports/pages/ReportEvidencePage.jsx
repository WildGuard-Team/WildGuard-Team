import { useState } from 'react';
import { CloudUpload, FolderOpen } from 'lucide-react';
import FormAlert from '../../auth/components/FormAlert.jsx';
import ReportLayout from '../components/ReportLayout.jsx';
import EvidenceUploader from '../components/EvidenceUploader.jsx';
import CommunityIcon from '../components/CommunityIcon.jsx';
import { useReportDraft } from '../context/useReportDraft.js';
import './optional-evidence.css';

export default function ReportEvidencePage({ navigate }) {
  const { draft, setEvidence, continueWithoutEvidence, evidenceHydrationStatus, evidenceRestoreError } = useReportDraft();
  const [isNavigating, setIsNavigating] = useState(false);
  function move(path, clearEvidence = false) {
    if (isNavigating) return;
    setIsNavigating(true);
    if (clearEvidence) continueWithoutEvidence();
    navigate(path);
  }
  const restoredEvidenceMessage = 'Your report details were restored. Please select your evidence files again after refreshing the page.';
  return <ReportLayout navigate={navigate} title="Optional Evidence" subtitle="Add photos or a short video to help verify your report. This step is optional." step={3} restorationMessage={draft.evidenceRestoreRequired ? restoredEvidenceMessage : undefined} className="community-evidence" hero heroEyebrow="SUBMIT REPORT">
    <div className="evidence-panel">
      {evidenceHydrationStatus === 'loading' && <p className="evidence-hydration-status" role="status">Restoring attached evidence…</p>}
      <FormAlert>{evidenceRestoreError}</FormAlert>
      <EvidenceUploader files={draft.evidence} onChange={setEvidence} browseLabel={draft.evidenceRestoreRequired ? 'Select evidence again' : 'Browse Files'} uploadIcon={<CloudUpload size={46} />} browseIcon={<FolderOpen size={23} aria-hidden="true" />} />
      <p className="evidence-information"><span aria-hidden="true">i</span> Evidence is optional. You can continue without uploading files.</p>
      <div className="evidence-actions"><button type="button" className="secondary-button" disabled={isNavigating} onClick={() => move('/reports/details')}>Back</button><button type="button" className="evidence-skip" disabled={isNavigating} onClick={() => move('/reports/review', true)}>{draft.evidenceRestoreRequired ? 'Continue without evidence' : 'Skip for now'}</button><button type="button" className="primary-button" disabled={isNavigating} onClick={() => move('/reports/review')}>Continue to Review <CommunityIcon name="chevron" size={21} /></button></div>
    </div>
  </ReportLayout>;
}
