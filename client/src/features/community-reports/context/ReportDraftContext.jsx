import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../context/useAuth.js';
import { ReportDraftContext } from './report-draft-context.js';
import {
  clearCommunityReportDraft, emptyCommunityReportDraft, loadCommunityReportDraft, saveCommunityReportDraft,
} from './community-report-draft.storage.js';

export function ReportDraftProvider({ children }) {
  const { user, isCheckingSession } = useAuth();
  const [draft, setDraft] = useState(loadCommunityReportDraft);
  const [submittedReport, setSubmittedReport] = useState(null);
  const lastUserId = useRef(undefined);

  useEffect(() => { saveCommunityReportDraft(draft); }, [draft]);
  useEffect(() => {
    if (isCheckingSession) return;
    const currentUserId = user?.id ?? null;
    if (lastUserId.current === undefined) {
      lastUserId.current = currentUserId;
      if (!currentUserId) { clearCommunityReportDraft(); setDraft(emptyCommunityReportDraft); }
      return;
    }
    if (lastUserId.current !== currentUserId) {
      lastUserId.current = currentUserId;
      clearCommunityReportDraft();
      setDraft(emptyCommunityReportDraft);
    }
  }, [isCheckingSession, user]);

  const value = useMemo(() => ({
    draft,
    updateDraft: (changes) => setDraft((current) => ({ ...current, ...changes })),
    updateLocation: (changes) => setDraft((current) => {
      const locationChanges = typeof changes === 'function' ? changes(current.location) : changes;
      if (!locationChanges) return current;
      return { ...current, location: { ...current.location, ...locationChanges } };
    }),
    submittedReport,
    setSubmittedReport,
    setEvidence: (evidence) => setDraft((current) => ({ ...current, evidence, evidenceRestoreRequired: false, wasRestored: false })),
    continueWithoutEvidence: () => setDraft((current) => ({ ...current, evidence: [], evidenceRestoreRequired: false })),
    clearDraft: () => { clearCommunityReportDraft(); setDraft(emptyCommunityReportDraft); },
    resetDraft: () => {
      clearCommunityReportDraft();
      setDraft(emptyCommunityReportDraft);
      setSubmittedReport(null);
    },
  }), [draft, submittedReport]);

  return <ReportDraftContext.Provider value={value}>{children}</ReportDraftContext.Provider>;
}
