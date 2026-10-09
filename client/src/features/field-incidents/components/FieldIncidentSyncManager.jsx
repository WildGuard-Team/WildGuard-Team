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
    FIELD_INCIDENT_SYNC_EVENT,
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

    const latestSubmittedIncident = useRef(submittedIncident);
    const synchronizeCurrentOwner = useRef(null);

    useEffect(() => {
      latestSubmittedIncident.current = submittedIncident;
    }, [submittedIncident]);
  
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
              { shouldContinue: () => active },
            );

          if (result.synced || result.failed) {
            window.dispatchEvent(new CustomEvent(FIELD_INCIDENT_SYNC_EVENT, {
              detail: { ownerId: user.id, syncedIncidents: result.syncedIncidents },
            }));
          }

          if (!active || !result.syncedIncidents.length) return;
  
          /*
           * If the Ranger is still looking at
           * the Pending Synchronization screen,
           * replace that pending object with the
           * real submitted incident returned by
           * the backend.
           */
          const confirmation = latestSubmittedIncident.current;
          if (
            confirmation?.status
              === FIELD_INCIDENT_PENDING_SYNC
            && confirmation.clientIncidentId
          ) {
            const synchronizedIncident =
              result.syncedIncidents.find(
                (incident) =>
                  incident.clientIncidentId
                  === confirmation.clientIncidentId,
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

          // A new Ranger may have waited for the previous request to finish.
          if (!active) synchronizeCurrentOwner.current?.();
        }
      }
  
      /*
       * Try pending incidents when WildGuard
       * loads while already online.
       */
      synchronizeCurrentOwner.current = synchronize;
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

        if (synchronizeCurrentOwner.current === synchronize) {
          synchronizeCurrentOwner.current = null;
        }
  
        window.removeEventListener(
          'online',
          synchronize,
        );
      };
    }, [
      isCheckingSession,
      user,
      setSubmittedIncident,
    ]);

    useEffect(() => {
      if (submittedIncident?.status === FIELD_INCIDENT_PENDING_SYNC) {
        synchronizeCurrentOwner.current?.();
      }
    }, [submittedIncident]);
  
    return null;
  }
