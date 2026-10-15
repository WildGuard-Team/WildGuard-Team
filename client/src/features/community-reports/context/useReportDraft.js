import { useContext } from 'react';
import { ReportDraftContext } from './report-draft-context.js';

export function useReportDraft() {
  const context = useContext(ReportDraftContext);
  if (!context) throw new Error('useReportDraft must be used within ReportDraftProvider.');
  return context;
}
