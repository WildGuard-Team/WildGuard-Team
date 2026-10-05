const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, '');

export async function submitReport(draft) {
  let response;
  try {
    response = await fetch(`${apiBaseUrl}/reports`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
  } catch {
    throw new Error('Unable to reach WildGuard. Check that the API is running and try again.');
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) throw new Error('Your session has expired. Please sign in again.');
    if (response.status >= 500) throw new Error('WildGuard is temporarily unavailable. Please try again.');
    throw new Error(payload?.error?.message ?? 'The report could not be submitted.');
  }
  return payload.report;
}
