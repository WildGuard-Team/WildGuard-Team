const apiBaseUrl = (import.meta.env?.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, '');

function isCount(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function isIncidentManagementResponse(payload) {
  return Array.isArray(payload?.incidents)
    && ['total', 'low', 'medium', 'high'].every((name) => isCount(payload.statistics?.[name]))
    && isCount(payload.pagination?.total)
    && isCount(payload.pagination?.totalPages)
    && Number.isSafeInteger(payload.pagination?.page) && payload.pagination.page > 0
    && Number.isSafeInteger(payload.pagination?.pageSize) && payload.pagination.pageSize > 0
    && Array.isArray(payload.filters?.parks)
    && payload.filters.parks.every((park) => typeof park === 'string');
}

export async function getManagedIncidentReports(queryString, { signal } = {}) {
  let response;
  try {
    response = await fetch(`${apiBaseUrl}/field-incidents/management?${queryString}`, {
      method: 'GET', credentials: 'include', signal,
    });
  } catch (error) {
    if (signal?.aborted || error?.name === 'AbortError') throw error;
    throw new Error('Unable to reach WildGuard. Check your connection and try again.');
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) throw new Error('Your session has expired. Please sign in again.');
    if (response.status === 403) {
      throw new Error(payload?.error?.message || 'You do not have permission to view incident reports.');
    }
    if (response.status >= 500) throw new Error('WildGuard is temporarily unavailable. Please try again.');
    throw new Error(payload?.error?.message || 'Unable to load incident reports.');
  }
  if (!isIncidentManagementResponse(payload)) {
    throw new Error('Incident reports could not be loaded. Please refresh and try again.');
  }
  return payload;
}
