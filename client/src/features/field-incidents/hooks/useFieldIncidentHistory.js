import { useCallback, useEffect, useRef, useState } from 'react';
import { getPendingFieldIncidents } from '../services/field-incident-offline-db.js';
import { mergeFieldIncidents } from '../services/field-incident-history.service.js';
import { getMyFieldIncidents } from '../services/field-incident.service.js';
import { FIELD_INCIDENT_SYNC_EVENT } from '../services/field-incident-sync.service.js';

function addConfirmedIncidents(submitted, confirmed) {
  const confirmedIds = new Set(confirmed.map((incident) => incident.id));
  return [...submitted.filter((incident) => !confirmedIds.has(incident.id)), ...confirmed];
}

export default function useFieldIncidentHistory(ownerId) {
  const [snapshot, setSnapshot] = useState({
    ownerId, submitted: [], pending: [], isLoading: true, serverError: '', offlineWarning: '',
  });
  const requestGeneration = useRef(0);

  const loadIncidents = useCallback(async (confirmed = []) => {
    const generation = ++requestGeneration.current;
    const [server, local] = await Promise.allSettled([
      getMyFieldIncidents(),
      getPendingFieldIncidents(ownerId),
    ]);
    if (generation !== requestGeneration.current) return;

    setSnapshot((current) => {
      const previous = current.ownerId === ownerId ? current : { submitted: [], pending: [] };
      return {
        ownerId,
        submitted: addConfirmedIncidents(
          server.status === 'fulfilled' ? server.value : previous.submitted,
          confirmed,
        ),
        pending: local.status === 'fulfilled' ? local.value : previous.pending,
        isLoading: false,
        serverError: server.status === 'rejected' ? server.reason?.message || 'Please try again.' : '',
        offlineWarning: local.status === 'rejected'
          ? 'Offline incidents could not be loaded. Submitted incidents are still available.'
          : '',
      };
    });
  }, [ownerId]);

  useEffect(() => {
    function handleSync(event) {
      if (event.detail?.ownerId !== ownerId) return;
      const confirmed = event.detail.syncedIncidents ?? [];
      if (confirmed.length) {
        const clientIds = new Set(confirmed.map((incident) => incident.clientIncidentId));
        setSnapshot((current) => current.ownerId === ownerId ? {
          ...current,
          submitted: addConfirmedIncidents(current.submitted, confirmed),
          pending: current.pending.filter((incident) => !clientIds.has(incident.clientIncidentId)),
        } : current);
      }
      loadIncidents(confirmed);
    }

    window.addEventListener(FIELD_INCIDENT_SYNC_EVENT, handleSync);
    loadIncidents();
    return () => {
      requestGeneration.current += 1;
      window.removeEventListener(FIELD_INCIDENT_SYNC_EVENT, handleSync);
    };
  }, [loadIncidents, ownerId]);

  function retry() {
    setSnapshot((current) => ({ ...current, isLoading: true }));
    loadIncidents();
  }

  const isCurrentOwner = snapshot.ownerId === ownerId;
  return {
    incidents: isCurrentOwner ? mergeFieldIncidents(snapshot.submitted, snapshot.pending, ownerId) : [],
    isLoading: !isCurrentOwner || snapshot.isLoading,
    serverError: isCurrentOwner ? snapshot.serverError : '',
    offlineWarning: isCurrentOwner ? snapshot.offlineWarning : '',
    retry,
  };
}
