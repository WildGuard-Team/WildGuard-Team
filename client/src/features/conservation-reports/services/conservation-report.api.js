const apiBaseUrl = (import.meta.env?.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, '');

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

export async function exportGeneratedConservationReport(reportId) {
  return downloadReportFile(reportId, 'export', 'csv');
}

export async function exportGeneratedConservationReportPdf(reportId) {
  return downloadReportFile(reportId, 'export/pdf', 'pdf');
}

async function downloadReportFile(reportId, path, extension) {
  const response = await fetch(`${apiBaseUrl}/conservation-reports/${encodeURIComponent(reportId)}/${path}`, {
    credentials: 'include',
  }).catch(() => {
    throw new ConservationReportApiError('Unable to reach WildGuard. The generated report is still available on screen.');
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw createResponseError(response.status, payload, 'The report could not be exported. It is still available on screen.');
  }
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const fileName = disposition.match(/filename="([^"]+)"/)?.[1] ?? `${reportId}.${extension}`;
  return { blob: await response.blob(), fileName };
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
    throw createResponseError(response.status, payload, 'The reporting service is temporarily unavailable. Please try again.');
  }
  return payload;
}

function createResponseError(status, payload, fallback) {
  const messages = {
    401: 'Your session has expired. Please sign in again.',
    403: 'Only Park Managers can access conservation reports.',
  };
  const message = messages[status]
    ?? (status >= 500 ? fallback : null)
    ?? payload?.error?.message
    ?? fallback;
  return new ConservationReportApiError(message, status);
}
