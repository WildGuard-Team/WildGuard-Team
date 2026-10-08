import { useEffect, useState } from 'react';
import { getMyReport, ReportDetailsError } from '../services/report.service.js';

export default function useReportDetails(reportId) {
  const [data, setData] = useState({ report: null, loading: true, error: null });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    async function load() {
      await Promise.resolve();
      if (!active) return;
      try {
        const report = await getMyReport(reportId, controller.signal);
        if (active) setData({ report, loading: false, error: null });
      } catch (error) {
        if (!active || error?.name === 'AbortError') return;
        setData({ report: null, loading: false, error: error instanceof ReportDetailsError ? error : new ReportDetailsError(0) });
      }
    }
    void load();
    return () => { active = false; controller.abort(); };
  }, [reportId, revision]);

  function retry() {
    setData({ report: null, loading: true, error: null });
    setRevision((value) => value + 1);
  }
  return { ...data, retry };
}
