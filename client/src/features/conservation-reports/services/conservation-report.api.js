const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, '');

export class ConservationReportApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.status = status;
  }
}

export function getConservationReportOptions() {
  return request('/options', { method: 'GET' });
}

export function generateConservationReport(parameters) {
  return request('', { method: 'POST', body: JSON.stringify(parameters) });
}

export function getGeneratedConservationReport(reportId) {
  return request(`/${encodeURIComponent(reportId)}`, { method: 'GET' });
}

async function request(path, options) {
  let response;
  try {
    response = await fetch(`${apiBaseUrl}/conservation-reports${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
  } catch {
    throw new ConservationReportApiError('Unable to reach WildGuard. Check that the API is running and try again.');
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const fallbacks = {
      401: 'Your session has expired. Please sign in again.',
      403: 'Only Park Managers can access conservation reports.',
    };
    const message = fallbacks[response.status]
      ?? (response.status >= 500 ? 'The reporting service is temporarily unavailable. Please try again.' : null)
      ?? payload?.error?.message
      ?? 'The report request could not be completed.';
    throw new ConservationReportApiError(message, response.status);
  }
  return payload;
}
