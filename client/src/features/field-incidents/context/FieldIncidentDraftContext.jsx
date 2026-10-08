import {
    useMemo,
    useState,
  } from 'react';
  
  import {
    FieldIncidentDraftContext,
  } from './field-incident-draft-context.js';
  
  function getCurrentDate() {
    return new Date()
      .toISOString()
      .slice(0, 10);
  }
  
  function getCurrentTime() {
    return new Date()
      .toTimeString()
      .slice(0, 5);
  }
  
  function createEmptyDraft() {
    return {
      incidentType: '',
  
      incidentDate: getCurrentDate(),
      incidentTime: getCurrentTime(),
  
      riskLevel: '',
  
      parkZone: '',
      blockArea: '',
  
      location: {
        source: null,
        coordinates: null,
        manualCoordinates: '',
        description: '',
      },
  
      description: '',
      additionalNotes: '',
  
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
      
          setEvidence(evidence) {
            setDraft((current) => ({
              ...current,
              evidence,
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