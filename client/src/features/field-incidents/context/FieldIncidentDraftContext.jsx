import { useEffect, useMemo, useState } from 'react';
import { FieldIncidentDraftContext } from './field-incident-draft-context.js';
import { createEmptyDraft } from '../utils/field-incident-draft.js';
import { clearStoredDraft, loadDraft, saveDraft } from '../services/field-incident-draft-storage.js';

export function FieldIncidentDraftProvider({ children }) {
  const [draft, setDraft] = useState(loadDraft);
  const [submittedIncident, setSubmittedIncident] = useState(null);

  useEffect(() => {
    saveDraft(draft);
  }, [draft]);

  const value = useMemo(() => ({
    draft,
    submittedIncident,
    setSubmittedIncident,
    updateDraft(changes) {
      setDraft((current) => ({ ...current, ...changes }));
    },
    updateLocation(changes) {
      setDraft((current) => ({ ...current, location: { ...current.location, ...changes } }));
    },
    setEvidence(evidence) {
      setDraft((current) => ({ ...current, evidence }));
    },
    clearDraft() {
      clearStoredDraft();
      setDraft(createEmptyDraft());
    },
    resetDraft() {
      clearStoredDraft();
      setSubmittedIncident(null);
      setDraft(createEmptyDraft());
    },
  }), [draft, submittedIncident]);

  return <FieldIncidentDraftContext.Provider value={value}>{children}</FieldIncidentDraftContext.Provider>;
}
