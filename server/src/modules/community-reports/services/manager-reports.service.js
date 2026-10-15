import { HttpError } from '../../../shared/http-error.js';
import { toPublicEvidence } from '../utils/evidence-mapper.js';
import { toPublicLocation } from '../utils/location-mapper.js';

function hasSafePublicUrl(evidence) {
  if (typeof evidence?.secureUrl !== 'string') return false;
  try {
    const url = new URL(evidence.secureUrl);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

function reporterInfo(reporter) {
  if (!reporter || typeof reporter !== 'object') return null;
  return {
    id: String(reporter._id ?? reporter.id),
    fullName: reporter.fullName ?? 'Community member',
    email: reporter.email ?? null,
  };
}

function reviewInfo(reviewer) {
  if (!reviewer || typeof reviewer !== 'object') return null;
  return { id: String(reviewer._id ?? reviewer.id), fullName: reviewer.fullName ?? 'Park Manager' };
}

export function toManagerReport(report, { details = false } = {}) {
  const mapped = {
    _id: String(report._id),
    referenceNumber: report.referenceNumber,
    reporter: reporterInfo(report.reporterId),
    reportType: report.reportType,
    description: report.description,
    location: report.location ? toPublicLocation(report.location) : null,
    status: report.status ?? 'under_review',
    createdAt: report.createdAt ?? null,
    incidentDateTime: report.incidentDateTime ?? null,
    rejectionReason: report.status === 'rejected' ? report.rejectionReason ?? null : null,
    reviewedAt: report.reviewedAt ?? null,
  };
  if (details) {
    mapped.evidence = (report.evidence ?? []).filter(hasSafePublicUrl).map(toPublicEvidence);
    mapped.reviewedBy = reviewInfo(report.reviewedBy);
  }
  return mapped;
}

export async function listManagerReports(filters, communityReports) {
  const reports = await communityReports.findForManager(filters);
  return reports.map((report) => toManagerReport(report));
}

export async function getManagerReport(reportId, communityReports) {
  const report = await communityReports.findByIdForManager(reportId);
  if (!report) throw new HttpError(404, 'Report not found.');
  return toManagerReport(report, { details: true });
}

export async function reviewManagerReport(reportId, managerId, decision, communityReports) {
  const report = await communityReports.updateReviewStatus(reportId, {
    ...decision,
    reviewedBy: managerId,
    reviewedAt: new Date(),
  });
  if (report) return toManagerReport(report, { details: true });
  const existing = await communityReports.findByIdForManager(reportId);
  if (!existing) throw new HttpError(404, 'Report not found.');
  throw new HttpError(409, 'This report has already been reviewed. Refresh to see its current status.');
}
