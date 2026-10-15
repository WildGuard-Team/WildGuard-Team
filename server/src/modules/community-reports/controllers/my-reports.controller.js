import { getMyReports } from '../services/my-reports.service.js';
import { validateMyReportsQuery } from '../validation/my-reports.validation.js';

export function myReportsController(communityReports) {
  return async (req, res) => {
    const status = validateMyReportsQuery(req.query);
    const reports = await getMyReports(req.auth.userId, status, communityReports);
    res.set('Cache-Control', 'no-store').status(200).json({ reports });
  };
}
