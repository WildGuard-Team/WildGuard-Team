import {
    useEffect,
    useRef,
  } from 'react';
  
  import {
    useAuth,
  } from '../../../context/useAuth.js';
  
  import {
    useFieldIncidentDraft,
  } from '../context/useFieldIncidentDraft.js';
  
  import {
    syncPendingFieldIncidents,
  } from '../services/field-incident-sync.service.js';
  
  import { FIELD_INCIDENT_PENDING_SYNC } from '../config/field-incident.constants.js';

  export default function FieldIncidentSyncManager() {
    const {
      user,
      isCheckingSession,
    } = useAuth();
  
    const {
      submittedIncident,
      setSubmittedIncident,
    } = useFieldIncidentDraft();
  
    const isSyncing =
      useRef(false);
  
    useEffect(() => {
      if (
        isCheckingSession
        || !user
        || user.role !== 'PARK_RANGER'
      ) {
        return undefined;
      }
  
      let active = true;
  
      async function synchronize() {
        if (
          !active
          || isSyncing.current
        ) {
          return;
        }
  
        if (
          typeof navigator !== 'undefined'
          && navigator.onLine === false
        ) {
          return;
        }
  
        isSyncing.current =
          true;
  
        try {
          const result =
            await syncPendingFieldIncidents(
              user.id,
            );
  
          if (
            !active
            || !result.syncedIncidents.length
          ) {
            return;
          }
  
          /*
           * If the Ranger is still looking at
           * the Pending Synchronization screen,
           * replace that pending object with the
           * real submitted incident returned by
           * the backend.
           */
          if (
            submittedIncident?.status
              === FIELD_INCIDENT_PENDING_SYNC
            && submittedIncident.clientIncidentId
          ) {
            const synchronizedIncident =
              result.syncedIncidents.find(
                (incident) =>
                  incident.clientIncidentId
                  === submittedIncident.clientIncidentId,
              );
  
            if (
              synchronizedIncident
            ) {
              setSubmittedIncident(
                synchronizedIncident,
              );
            }
          }
        } catch (error) {
          console.error(
            'Pending field incident synchronization failed.',
            error,
          );
        } finally {
          isSyncing.current =
            false;
        }
      }
  
      /*
       * Try pending incidents when WildGuard
       * loads while already online.
       */
      synchronize();
  
      /*
       * Automatically retry when the
       * browser comes back online.
       */
      window.addEventListener(
        'online',
        synchronize,
      );
  
      return () => {
        active = false;
  
        window.removeEventListener(
          'online',
          synchronize,
        );
      };
    }, [
      isCheckingSession,
      user,
      submittedIncident,
      setSubmittedIncident,
    ]);
  
    return null;
  }
