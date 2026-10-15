import {
    FieldIncidentNetworkError,
    submitFieldIncident,
  } from './field-incident.service.js';
  
  import {
    deletePendingFieldIncident,
    getPendingFieldIncidents,
    markPendingFieldIncidentAttempt,
  } from './field-incident-offline-db.js';
  
  export const FIELD_INCIDENT_SYNC_EVENT = 'wildguard:field-incidents-sync';

  export async function syncPendingFieldIncidents(
    ownerId,
    { shouldContinue = () => true } = {},
  ) {
    if (!ownerId || !shouldContinue()) {
      return {
        synced: 0,
        failed: 0,
        syncedIncidents: [],
      };
    }
  
    if (
      typeof navigator !== 'undefined'
      && navigator.onLine === false
    ) {
      return {
        synced: 0,
        failed: 0,
        syncedIncidents: [],
      };
    }
  
    const pendingIncidents =
      await getPendingFieldIncidents(
        ownerId,
      );
  
    let synced = 0;
    let failed = 0;
  
    const syncedIncidents = [];
  
    for (
      const pendingIncident
      of pendingIncidents
    ) {
      // Do not start another request after this Ranger signs out or changes.
      if (!shouldContinue()) break;

      try {
        const incident =
          await submitFieldIncident(
            pendingIncident.draft,
          );
  
        /*
         * Delete the local copy only after
         * the server confirms submission.
         */
        await deletePendingFieldIncident(
          pendingIncident.clientIncidentId,
        );
  
        syncedIncidents.push(
          incident,
        );
  
        synced += 1;
      } catch (error) {
        failed += 1;
  
        await markPendingFieldIncidentAttempt(
          pendingIncident.clientIncidentId,
          error?.message
          ?? 'Synchronization failed.',
        );
  
        /*
         * Stop processing if the network
         * disappears again.
         */
        if (
          error
          instanceof FieldIncidentNetworkError
        ) {
          break;
        }
      }
    }
  
    return {
      synced,
      failed,
      syncedIncidents,
    };
  }
