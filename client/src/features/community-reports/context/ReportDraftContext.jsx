import { useMemo, useState } from 'react';
import { ReportDraftContext } from './report-draft-context.js';

const emptyDraft = { reportType: '', description: '', manualLocation: '' };
export function ReportDraftProvider({ children }) {
  const [draft, setDraft] = useState(emptyDraft);
  const [submittedReport, setSubmittedReport] = useState(null);

  const value = useMemo(() => ({
    draft,
    updateDraft: (changes) => setDraft((current) => ({ ...current, ...changes })),
    submittedReport,
    setSubmittedReport,
    resetDraft: () => {
      setDraft(emptyDraft);
      setSubmittedReport(null);
    },
  }), [draft, submittedReport]);

  return <ReportDraftContext.Provider value={value}>{children}</ReportDraftContext.Provider>;
}
