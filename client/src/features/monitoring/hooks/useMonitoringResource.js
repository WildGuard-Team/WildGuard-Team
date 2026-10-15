import { useCallback, useEffect, useState } from "react";

export function useMonitoringResource(loader, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((previous) => previous + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const result = await loader();

        if (active) {
          setData(result);
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [...dependencies, refreshKey]);

  return {
    data,
    loading,
    error,
    refresh,
  };
}
