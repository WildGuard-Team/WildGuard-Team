import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../context/useAuth.js';
import { validateEvidenceSelection } from '../validation/evidence.validation.js';
import { ReportDraftContext } from './report-draft-context.js';
import { clearCommunityReportDraft, createEmptyCommunityReportDraft, loadCommunityReportDraft, saveCommunityReportDraft } from './community-report-draft.storage.js';
import { clearEvidenceDraftFiles, clearOwnerEvidenceDrafts, deleteExpiredEvidenceDrafts, loadEvidenceDraftFiles, saveEvidenceDraftFiles } from '../services/evidence-draft.indexeddb.js';

export function ReportDraftProvider({ children }) {
  const { user, isCheckingSession } = useAuth();
  const [draft, setDraft] = useState(loadCommunityReportDraft);
  const [submittedReport, setSubmittedReport] = useState(null);
  const [evidenceHydrationStatus, setEvidenceHydrationStatus] = useState('idle');
  const [evidenceRestoreError, setEvidenceRestoreError] = useState('');
  const ownerId = user?.id ?? null;
  const lastOwnerId = useRef(undefined); const hydrationDraftId = useRef(null);
  useEffect(() => { saveCommunityReportDraft(draft); }, [draft]);
  useEffect(() => { deleteExpiredEvidenceDrafts().catch(() => {}); }, []);
  useEffect(() => {
    if (isCheckingSession) return undefined;
    if (lastOwnerId.current !== undefined && lastOwnerId.current !== ownerId) {
      if (lastOwnerId.current) clearOwnerEvidenceDrafts(lastOwnerId.current).catch(() => {});
      clearCommunityReportDraft(); setDraft(createEmptyCommunityReportDraft()); setEvidenceHydrationStatus('ready'); setEvidenceRestoreError('');
    }
    lastOwnerId.current = ownerId;
    if (!ownerId) { clearCommunityReportDraft(); setDraft(createEmptyCommunityReportDraft()); setEvidenceHydrationStatus('ready'); return undefined; }
    if (!draft.evidenceRestoreRequired || hydrationDraftId.current === draft.draftId) { if (!draft.evidenceRestoreRequired) setEvidenceHydrationStatus('ready'); return undefined; }
    let active = true; hydrationDraftId.current = draft.draftId; setEvidenceHydrationStatus('loading'); setEvidenceRestoreError('');
    loadEvidenceDraftFiles({ ownerId, draftId: draft.draftId }).then((files) => {
      if (!active) return;
      const { accepted } = validateEvidenceSelection(files ?? [], []);
      if (!files || accepted.length !== files.length || !accepted.length) throw new Error('Evidence could not be recovered.');
      setDraft((current) => current.draftId === draft.draftId ? { ...current, evidence: accepted, evidenceRestoreRequired: false } : current); setEvidenceHydrationStatus('ready');
    }).catch(() => {
      if (!active) return;
      setDraft((current) => current.draftId === draft.draftId ? { ...current, evidence: [], evidenceRestoreRequired: true } : current);
      setEvidenceRestoreError('Your report details were restored, but the evidence files could not be recovered. Please select them again.'); setEvidenceHydrationStatus('failed');
    });
    return () => { active = false; };
  }, [draft.draftId, draft.evidenceRestoreRequired, isCheckingSession, ownerId]);
  useEffect(() => {
    if (!ownerId || evidenceHydrationStatus !== 'ready') return;
    if (!draft.evidence.length) { clearEvidenceDraftFiles({ ownerId, draftId: draft.draftId }).catch(() => {}); return; }
    saveEvidenceDraftFiles({ ownerId, draftId: draft.draftId, files: draft.evidence }).then(() => setEvidenceRestoreError('')).catch(() => setEvidenceRestoreError('Evidence is selected, but it could not be saved for refresh recovery. Keep this tab open until submission.'));
  }, [draft.draftId, draft.evidence, evidenceHydrationStatus, ownerId]);
  function discardDraft() { if (ownerId) clearEvidenceDraftFiles({ ownerId, draftId: draft.draftId }).catch(() => {}); clearCommunityReportDraft(); hydrationDraftId.current = null; setDraft(createEmptyCommunityReportDraft()); setEvidenceHydrationStatus('ready'); setEvidenceRestoreError(''); }
  const value = useMemo(() => ({
    draft, updateDraft: (changes) => setDraft((current) => ({ ...current, ...changes })),
    updateLocation: (changes) => setDraft((current) => { const next = typeof changes === 'function' ? changes(current.location) : changes; return next ? { ...current, location: { ...current.location, ...next } } : current; }),
    submittedReport, setSubmittedReport, evidenceHydrationStatus, evidenceRestoreError,
    setEvidence: (evidence) => { setEvidenceHydrationStatus('ready'); setEvidenceRestoreError(''); setDraft((current) => ({ ...current, evidence, evidenceRestoreRequired: false, wasRestored: false })); },
    continueWithoutEvidence: () => { setEvidenceHydrationStatus('ready'); setEvidenceRestoreError(''); setDraft((current) => ({ ...current, evidence: [], evidenceRestoreRequired: false })); },
    clearDraft: discardDraft, resetDraft: () => { discardDraft(); setSubmittedReport(null); },
  }), [draft, evidenceHydrationStatus, evidenceRestoreError, ownerId, submittedReport]);
  return <ReportDraftContext.Provider value={value}>{children}</ReportDraftContext.Provider>;
}
