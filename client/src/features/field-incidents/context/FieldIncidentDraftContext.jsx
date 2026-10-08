import {
    useEffect,
    useMemo,
    useState,
  } from 'react';
  
  import {
    FieldIncidentDraftContext,
  } from './field-incident-draft-context.js';
  
  const STORAGE_KEY =
    'wildguard.fieldIncidentDraft.v1';
  
  function createClientIncidentId() {
    if (
      typeof crypto !== 'undefined'
      && typeof crypto.randomUUID === 'function'
    ) {
      return crypto.randomUUID();
    }
  
    return (
      `incident-${Date.now()}-`
      + Math.random()
        .toString(16)
        .slice(2)
    );
  }
  
  function getCurrentDate() {
    const now = new Date();
  
    const year =
      now.getFullYear();
  
    const month =
      String(
        now.getMonth() + 1,
      ).padStart(2, '0');
  
    const day =
      String(
        now.getDate(),
      ).padStart(2, '0');
  
    return `${year}-${month}-${day}`;
  }
  
  function getCurrentTime() {
    const now = new Date();
  
    const hours =
      String(
        now.getHours(),
      ).padStart(2, '0');
  
    const minutes =
      String(
        now.getMinutes(),
      ).padStart(2, '0');
  
    return `${hours}:${minutes}`;
  }
  
  function createEmptyDraft() {
    return {
      clientIncidentId:
        createClientIncidentId(),
  
      incidentType: '',
  
      incidentDate:
        getCurrentDate(),
  
      incidentTime:
        getCurrentTime(),
  
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
  
  function loadDraft() {
    try {
      const stored =
        sessionStorage.getItem(
          STORAGE_KEY,
        );
  
      if (!stored) {
        return createEmptyDraft();
      }
  
      const parsed =
        JSON.parse(
          stored,
        );
  
      const emptyDraft =
        createEmptyDraft();
  
      return {
        ...emptyDraft,
        ...parsed,
  
        /*
         * If an older saved draft does not
         * contain a clientIncidentId,
         * generate one now.
         */
        clientIncidentId:
          parsed.clientIncidentId
          || createClientIncidentId(),
  
        location: {
          ...emptyDraft.location,
          ...parsed.location,
        },
  
        /*
         * Normal sessionStorage cannot
         * restore File objects.
         *
         * Pending offline incidents will
         * store evidence separately in
         * IndexedDB.
         */
        evidence: [],
      };
    } catch {
      return createEmptyDraft();
    }
  }
  
  function saveDraft(
    draft,
  ) {
    try {
      const snapshot = {
        clientIncidentId:
          draft.clientIncidentId,
  
        incidentType:
          draft.incidentType,
  
        incidentDate:
          draft.incidentDate,
  
        incidentTime:
          draft.incidentTime,
  
        riskLevel:
          draft.riskLevel,
  
        parkZone:
          draft.parkZone,
  
        blockArea:
          draft.blockArea,
  
        location:
          draft.location,
  
        description:
          draft.description,
  
        additionalNotes:
          draft.additionalNotes,
      };
  
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          snapshot,
        ),
      );
    } catch {
      /*
       * Keep the in-memory draft available
       * if browser storage is unavailable.
       */
    }
  }
  
  function clearStoredDraft() {
    try {
      sessionStorage.removeItem(
        STORAGE_KEY,
      );
    } catch {
      // Ignore unavailable browser storage.
    }
  }
  
  export function FieldIncidentDraftProvider({
    children,
  }) {
    const [
      draft,
      setDraft,
    ] = useState(
      loadDraft,
    );
  
    const [
      submittedIncident,
      setSubmittedIncident,
    ] = useState(
      null,
    );
  
    useEffect(() => {
      saveDraft(
        draft,
      );
    }, [
      draft,
    ]);
  
    const value =
      useMemo(
        () => ({
          draft,
  
          submittedIncident,
  
          setSubmittedIncident,
  
          updateDraft(changes) {
            setDraft(
              (current) => ({
                ...current,
                ...changes,
              }),
            );
          },
  
          updateLocation(changes) {
            setDraft(
              (current) => ({
                ...current,
  
                location: {
                  ...current.location,
                  ...changes,
                },
              }),
            );
          },
  
          setEvidence(evidence) {
            setDraft(
              (current) => ({
                ...current,
                evidence,
              }),
            );
          },
  
          clearDraft() {
            clearStoredDraft();
  
            setDraft(
              createEmptyDraft(),
            );
          },
  
          resetDraft() {
            clearStoredDraft();
  
            setSubmittedIncident(
              null,
            );
  
            setDraft(
              createEmptyDraft(),
            );
          },
        }),
        [
          draft,
          submittedIncident,
        ],
      );
  
    return (
      <FieldIncidentDraftContext.Provider
        value={value}
      >
        {children}
      </FieldIncidentDraftContext.Provider>
    );
  }