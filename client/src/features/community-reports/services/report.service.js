import { parseIncidentDateTime, validateIncidentDateTime } from '../validation/incidentDateTime.validation.js';

const apiBaseUrl = (import.meta.env?.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, '');

export class ReportNetworkError extends Error {
  constructor() {
    super('Unable to reach WildGuard. Check your connection and try again.');
    this.name = 'ReportNetworkError';
  }
}

export function prepareReportSubmission(draft) {
  const dateError = validateIncidentDateTime(draft.incidentDateTime);
  if (dateError) throw new Error(dateError);
  const incidentDateTime = parseIncidentDateTime(draft.incidentDateTime).toISOString();
  const location = {
    source: draft.location.source,
    coordinates: draft.location.coordinates,
  };
  if (draft.location.displayName) location.displayName = draft.location.displayName;
  if (draft.location.source === 'MANUAL') location.manualLocation = draft.location.manualLocation;
  return { clientSubmissionId: draft.clientSubmissionId, reportType: draft.reportType, description: draft.description, incidentDateTime, location, evidence: draft.evidence };
}

export async function submitReport(submission) {
  const { evidence, ...requestBody } = submission;
  const hasEvidence = evidence.length > 0;
  let response;
  try {
    response = await fetch(`${apiBaseUrl}/reports`, {
      method: 'POST',
      credentials: 'include',
      ...(hasEvidence ? { body: toReportFormData(requestBody, evidence) } : {
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody),
      }),
    });
  } catch {
    throw new ReportNetworkError();
  }

  const payload = await response.json().catch((error) => {
    if (response.ok && error instanceof TypeError) throw new ReportNetworkError();
    return null;
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('Your session has expired. Please sign in again.');
    if (response.status === 403) throw new Error('You do not have permission to submit this report.');
    if (response.status === 413) throw new Error('One or more evidence files are too large.');
    if (response.status === 503) throw new Error('Evidence upload is temporarily unavailable. Please try again.');
    if (response.status >= 500) throw new Error('WildGuard is temporarily unavailable. Please try again.');
    throw new Error(payload?.error?.message ?? 'The report could not be submitted.');
  }
  if (!(response.status === 201 || (response.status === 200 && payload?.duplicateRetry === true)) || !payload?.report?.referenceNumber) {
    throw new Error('The report could not be confirmed. Please try again.');
  }
  return payload.report;
}

function toReportFormData(report, evidence) {
  const formData = new FormData();
  formData.append('clientSubmissionId', report.clientSubmissionId);
  formData.append('reportType', report.reportType);
  formData.append('description', report.description);
  formData.append('incidentDateTime', report.incidentDateTime);
  formData.append('location', JSON.stringify(report.location));
  evidence.forEach((file) => formData.append('evidence', file));
  return formData;
}

export async function getMyReports(status, signal) {
  const query = status ? `?${new URLSearchParams({ status })}` : '';
  const response = await fetch(`${apiBaseUrl}/reports/my-reports${query}`, { credentials: 'include', cache: 'no-store', signal });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) throw new Error('Your session has expired. Please sign in again to load submitted reports.');
    throw new Error(payload?.error?.message ?? 'Unable to load submitted reports. Please try again.');
  }
  if (!Array.isArray(payload?.reports)) throw new Error('Unable to load submitted reports. Please try again.');
  return payload.reports;
}
