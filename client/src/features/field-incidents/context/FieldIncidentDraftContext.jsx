import {
    useMemo,
    useState,
  } from 'react';
  
  import {
    FieldIncidentDraftContext,
  } from './field-incident-draft-context.js';
  
  function createEmptyDraft() {
    return {
      incidentType: '',
      description: '',
      additionalNotes: '',
  
      location: {
        source: null,
        coordinates: null,
        manualLocation: '',
      },
  
      evidence: [],
    };
  }
  
  export function FieldIncidentDraftProvider({
    children,
  }) {
    const [draft, setDraft] = useState(
      createEmptyDraft,
    );
  
    const value = useMemo(
      () => ({
        draft,
  
        updateDraft(changes) {
          setDraft((current) => ({
            ...current,
            ...changes,
          }));
        },
  
        updateLocation(changes) {
          setDraft((current) => ({
            ...current,
            location: {
              ...current.location,
              ...changes,
            },
          }));
        },
  
        resetDraft() {
          setDraft(createEmptyDraft());
        },
      }),
      [draft],
    );
  
    return (
      <FieldIncidentDraftContext.Provider
        value={value}
      >
        {children}
      </FieldIncidentDraftContext.Provider>
    );
  }