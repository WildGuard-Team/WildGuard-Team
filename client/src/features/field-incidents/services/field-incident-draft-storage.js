import { createEmptyDraft } from '../utils/field-incident-draft.js';
import { reconcileFieldIncidentLocation } from '../utils/field-incident-location.js';

const STORAGE_KEY = 'wildguard.fieldIncidentDraft.v1';

export function loadDraft() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return createEmptyDraft();
    const parsed = JSON.parse(stored);
    const emptyDraft = createEmptyDraft();
    return {
      ...emptyDraft,
      ...parsed,
      clientIncidentId: parsed.clientIncidentId || emptyDraft.clientIncidentId,
      location: reconcileFieldIncidentLocation({ ...emptyDraft.location, ...parsed.location }),
      // Session storage cannot restore Files; the offline queue retains them in IndexedDB.
      evidence: [],
    };
  } catch {
    return createEmptyDraft();
  }
}

export function saveDraft(draft) {
  try {
    const snapshot = {
      clientIncidentId: draft.clientIncidentId,
      incidentType: draft.incidentType,
      incidentDate: draft.incidentDate,
      incidentTime: draft.incidentTime,
      riskLevel: draft.riskLevel,
      parkZone: draft.parkZone,
      blockArea: draft.blockArea,
      location: draft.location,
      description: draft.description,
      additionalNotes: draft.additionalNotes,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Keep the in-memory draft usable when browser storage is unavailable.
  }
}

export function clearStoredDraft() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Unavailable storage must not prevent resetting the in-memory draft.
  }
}
