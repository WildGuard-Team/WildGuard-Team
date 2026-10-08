import { HttpError } from '../../../shared/http-error.js';
import { toPublicLocation } from '../utils/location-mapper.js';
import { toPublicEvidence } from '../utils/evidence-mapper.js';

function hasSafePublicUrl(evidence) {
  if (typeof evidence?.secureUrl !== 'string') return false;
  try {
    const url = new URL(evidence.secureUrl);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

export async function getMyReportDetails(reporterId, reportId, communityReports) {
  // Ownership is part of the database query: a foreign ID is indistinguishable
  // from a missing report and no foreign document is fetched into this service.
  const report = await communityReports.findByIdAndReporter(reportId, reporterId);
  if (!report) throw new HttpError(404, 'Report not found.');
  return {
    _id: String(report._id),
    referenceNumber: report.referenceNumber,
    reportType: report.reportType,
    description: report.description,
    status: report.status ?? 'under_review',
    createdAt: report.createdAt ?? null,
    incidentDateTime: report.incidentDateTime ?? null,
    location: report.location ? toPublicLocation(report.location) : null,
    evidence: (report.evidence ?? []).filter(hasSafePublicUrl).map(toPublicEvidence),
  };
}
