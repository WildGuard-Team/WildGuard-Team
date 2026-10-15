import { useEffect, useState } from 'react';
import { getMyReports } from '../services/report.service.js';

const initialState = { reports: [], loading: true, error: '' };

/**
 * Loads server-submitted reports for the authenticated member. Offline drafts
 * intentionally do not belong in this view or its summary totals.
 */
export function useDashboardReports(userId) {
  const [state, setState] = useState(initialState);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    if (!userId) return undefined;

    const controller = new AbortController();
    let active = true;

    async function load() {
      // Defer one microtask so React's development-only effect replay can clean
      // up before issuing a request, while real unmounts never start one.
      await Promise.resolve();
      if (!active) return;
      try {
        const reports = await getMyReports(undefined, controller.signal);
        if (active) setState({ reports, loading: false, error: '' });
      } catch (error) {
        if (!active || error?.name === 'AbortError') return;
        setState({ reports: [], loading: false, error: 'Unable to load your submitted reports right now.' });
      }
    }
    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [requestVersion, userId]);

  function retry() {
    setState({ reports: [], loading: true, error: '' });
    setRequestVersion((version) => version + 1);
  }

  return { ...state, retry };
}
