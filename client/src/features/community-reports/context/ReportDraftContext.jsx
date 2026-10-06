import { useMemo, useState } from 'react';
import { ReportDraftContext } from './report-draft-context.js';

const emptyDraft = {
  reportType: '',
  description: '',
  location: { source: null, coordinates: null, displayName: '', manualLocation: '' },
  evidence: [],
};
export function ReportDraftProvider({ children }) {
  const [draft, setDraft] = useState(emptyDraft);
  const [submittedReport, setSubmittedReport] = useState(null);

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
    clearDraft: () => setDraft(emptyDraft),
    resetDraft: () => {
      setDraft(emptyDraft);
      setSubmittedReport(null);
    },
  }), [draft, submittedReport]);

  return <ReportDraftContext.Provider value={value}>{children}</ReportDraftContext.Provider>;
}
