const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, '');

export async function submitReport(draft) {
  const location = {
    source: draft.location.source,
    coordinates: draft.location.coordinates,
  };
  if (draft.location.displayName) location.displayName = draft.location.displayName;
  if (draft.location.source === 'MANUAL') location.manualLocation = draft.location.manualLocation;
  const requestBody = { reportType: draft.reportType, description: draft.description, location };
  const hasEvidence = draft.evidence.length > 0;
  let response;
  try {
    response = await fetch(`${apiBaseUrl}/reports`, {
      method: 'POST',
      credentials: 'include',
      ...(hasEvidence ? { body: toReportFormData(requestBody, draft.evidence) } : {
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody),
      }),
    });
  } catch {
    throw new Error('Unable to reach WildGuard. Check that the API is running and try again.');
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) throw new Error('Your session has expired. Please sign in again.');
    if (response.status === 403) throw new Error('You do not have permission to submit this report.');
    if (response.status === 413) throw new Error('One or more evidence files are too large.');
    if (response.status === 503) throw new Error('Evidence upload is temporarily unavailable. Please try again.');
    if (response.status >= 500) throw new Error('WildGuard is temporarily unavailable. Please try again.');
    throw new Error(payload?.error?.message ?? 'The report could not be submitted.');
  }
  return payload.report;
}

function toReportFormData(report, evidence) {
  const formData = new FormData();
  formData.append('reportType', report.reportType);
  formData.append('description', report.description);
  formData.append('location', JSON.stringify(report.location));
  evidence.forEach((file) => formData.append('evidence', file));
  return formData;
}
