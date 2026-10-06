const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, '');

export async function submitReport(draft) {
  const location = {
    source: draft.location.source,
    coordinates: draft.location.coordinates,
  };
  if (draft.location.displayName) location.displayName = draft.location.displayName;
  if (draft.location.source === 'MANUAL') location.manualLocation = draft.location.manualLocation;
  let response;
  try {
    response = await fetch(`${apiBaseUrl}/reports`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportType: draft.reportType, description: draft.description, location }),
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
