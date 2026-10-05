import { useEffect, useState } from 'react';
import { getHealth } from '../../services/api.js';

export default function ApiHealth() {
  const [status, setStatus] = useState({ state: 'checking', message: 'Checking API and MongoDB…' });

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let active = true;

    getHealth(controller.signal)
      .then(() => {
        if (active) setStatus({ state: 'ready', message: 'API running · MongoDB connected' });
      })
      .catch((error) => {
        if (active) setStatus({
          state: 'unavailable',
          message: error.name === 'AbortError'
            ? 'API check timed out. Check that MongoDB and the server are running.'
            : `${error.message} Check the server terminal and environment settings.`,
        });
      })
      .finally(() => clearTimeout(timeout));

    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, []);

  return <p className={`health health--${status.state}`} role="status">{status.message}</p>;
}
