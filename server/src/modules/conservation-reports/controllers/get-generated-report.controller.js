import { getGeneratedReport } from '../services/generated-report.service.js';

export function createGetGeneratedReportController(reports) {
  return async function getReport(req, res) {
    const report = await getGeneratedReport({
      reportId: req.params.reportId,
      managerId: req.auth.userId,
    }, reports);
    res.set('Cache-Control', 'private, no-store').status(200).json({ report });
  };
}
