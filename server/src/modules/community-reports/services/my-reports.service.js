import { toPublicLocation } from '../utils/location-mapper.js';

export async function getMyReports(reporterId, status, communityReports) {
  const reports = await communityReports.findByReporter(reporterId, status);
  return reports.map((report) => ({
    _id: String(report._id),
    referenceNumber: report.referenceNumber,
    reportType: report.reportType,
    description: report.description,
    location: report.location ? toPublicLocation(report.location) : null,
    status: report.status ?? 'under_review',
    createdAt: report.createdAt ?? report._id.getTimestamp(),
  }));
}
