import {
  getManagerReport,
  listManagerReports,
  reviewManagerReport,
} from '../services/manager-reports.service.js';
import {
  validateManagerReportId,
  validateManagerReportsQuery,
  validateReviewDecision,
} from '../validation/manager-reports.validation.js';

export function managerReportsController(communityReports) {
  return async (req, res) => {
    const filters = validateManagerReportsQuery(req.query);
    const reports = await listManagerReports(filters, communityReports);
    res.set('Cache-Control', 'no-store').status(200).json({ reports });
  };
}

export function managerReportDetailsController(communityReports) {
  return async (req, res) => {
    const reportId = validateManagerReportId(req.params.reportId);
    const report = await getManagerReport(reportId, communityReports);
    res.set('Cache-Control', 'no-store').status(200).json({ report });
  };
}

export function reviewManagerReportController(communityReports) {
  return async (req, res) => {
    const reportId = validateManagerReportId(req.params.reportId);
    const decision = validateReviewDecision(req.body);
    const report = await reviewManagerReport(reportId, req.auth.userId, decision, communityReports);
    res.set('Cache-Control', 'no-store').status(200).json({ report });
  };
}
