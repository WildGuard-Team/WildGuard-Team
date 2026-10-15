const apiBaseUrl = (import.meta.env?.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, '');

async function readResponse(response, fallback) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) throw new Error('Your session has expired. Please sign in again.');
    if (response.status === 403) throw new Error('Only Park Managers can review community reports.');
    throw new Error(payload?.error?.message ?? fallback);
  }
  return payload;
}

export async function getManagerCommunityReports(filters, signal) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) query.set(key, value);
  }
  const suffix = query.size ? `?${query}` : '';
  const response = await fetch(`${apiBaseUrl}/reports/manager${suffix}`, {
    credentials: 'include', cache: 'no-store', signal,
  });
  const payload = await readResponse(response, 'Unable to load community reports.');
  if (!Array.isArray(payload?.reports)) throw new Error('Unable to load community reports.');
  return payload.reports;
}

export async function getManagerCommunityReport(reportId, signal) {
  const response = await fetch(`${apiBaseUrl}/reports/manager/${encodeURIComponent(reportId)}`, {
    credentials: 'include', cache: 'no-store', signal,
  });
  const payload = await readResponse(response, 'Unable to load this community report.');
  if (!payload?.report?._id) throw new Error('Unable to load this community report.');
  return payload.report;
}

export async function reviewCommunityReport(reportId, decision) {
  const response = await fetch(`${apiBaseUrl}/reports/manager/${encodeURIComponent(reportId)}/status`, {
    method: 'PATCH', credentials: 'include',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(decision),
  });
  const payload = await readResponse(response, 'Unable to update the report status.');
  if (!payload?.report?._id) throw new Error('Unable to confirm the report status update.');
  return payload.report;
}
