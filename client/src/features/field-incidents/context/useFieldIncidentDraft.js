import { useContext } from 'react';

import {
  FieldIncidentDraftContext,
} from './field-incident-draft-context.js';

export function useFieldIncidentDraft() {
  const context =
    useContext(FieldIncidentDraftContext);

  if (!context) {
    throw new Error(
      'useFieldIncidentDraft must be used inside FieldIncidentDraftProvider.',
    );
  }

  return context;
}