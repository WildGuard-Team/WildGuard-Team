const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '');

export async function getHealth(signal) {
  if (!apiBaseUrl) throw new Error('Set VITE_API_BASE_URL in client/.env and restart Vite.');
  const response = await fetch(`${apiBaseUrl}/health`, { signal });
  if (!response.ok) throw new Error(`API health check failed (HTTP ${response.status}).`);
  const health = await response.json();
  if (health.status !== 'ok' || health.database !== 'connected') {
    throw new Error('The API or MongoDB is not ready.');
  }
  return health;
}
