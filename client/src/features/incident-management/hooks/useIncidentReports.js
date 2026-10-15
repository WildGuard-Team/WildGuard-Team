import { useEffect, useState } from 'react';
import { getManagedIncidentReports } from '../services/incident-management.api.js';
import {
  serializeIncidentManagementQuery, validateIncidentManagementDates,
} from '../utils/incident-management-query.js';

export default function useIncidentReports(ownerId, query) {
  const [snapshot, setSnapshot] = useState(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const validationError = validateIncidentManagementDates(query);
  const queryString = serializeIncidentManagementQuery(query);
  const requestKey = JSON.stringify([ownerId, queryString, refreshVersion]);

  useEffect(() => {
    if (validationError) return undefined;
    const controller = new AbortController();
    let active = true;
    // Briefly combine changes while typing without allowing an older response to replace new filters.
    const timer = window.setTimeout(() => {
      getManagedIncidentReports(queryString, { signal: controller.signal })
        .then((response) => {
          if (active) setSnapshot({ ownerId, requestKey, response, error: '' });
        })
        .catch((error) => {
          if (active && !controller.signal.aborted) {
            setSnapshot({ ownerId, requestKey, response: null, error: error.message || 'Please try again.' });
          }
        });
    }, 200);
    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [ownerId, queryString, requestKey, validationError]);

  const current = snapshot?.requestKey === requestKey ? snapshot : null;
  const response = !validationError ? current?.response : null;
  return {
    incidents: response?.incidents ?? [],
    statistics: response?.statistics ?? null,
    pagination: response?.pagination ?? null,
    parks: !current?.error && snapshot?.ownerId === ownerId ? snapshot?.response?.filters.parks ?? [] : [],
    error: current?.error ?? '',
    validationError,
    isLoading: !validationError && !current,
    refresh: () => setRefreshVersion((version) => version + 1),
  };
}
