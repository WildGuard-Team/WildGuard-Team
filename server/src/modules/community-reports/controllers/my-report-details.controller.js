import { getMyReportDetails } from '../services/my-report-details.service.js';
import { validateMyReportId } from '../validation/my-report-details.validation.js';

export function myReportDetailsController(communityReports) {
  return async (req, res) => {
    const reportId = validateMyReportId(req.params.reportId);
    const report = await getMyReportDetails(req.auth.userId, reportId, communityReports);
    res.set('Cache-Control', 'no-store').status(200).json({ report });
  };
}
