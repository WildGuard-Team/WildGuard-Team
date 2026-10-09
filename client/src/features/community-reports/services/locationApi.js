const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, '');

async function requestLocation(path, fallbackMessage) {
  let response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, { credentials: 'include' });
  } catch {
    throw new Error('Unable to reach WildGuard. Check your connection and try again.');
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) throw new Error('Your session has expired. Please sign in again.');
    if (response.status === 403) throw new Error('You are not allowed to use location search.');
    if (response.status === 503) throw new Error('Location lookup is temporarily unavailable. You can still select a point on the map.');
    throw new Error(payload?.error?.message ?? fallbackMessage);
  }
  return payload;
}

export async function searchLocations(query) {
  const params = new URLSearchParams({ q: query });
  const payload = await requestLocation(`/reports/locations/search?${params}`, 'Location search failed.');
  return payload.results ?? [];
}

export async function reverseGeocode(coordinates) {
  const params = new URLSearchParams({
    latitude: String(coordinates.latitude),
    longitude: String(coordinates.longitude),
  });
  const payload = await requestLocation(`/reports/locations/reverse?${params}`, 'Address lookup failed.');
  return payload.location ?? null;
}
