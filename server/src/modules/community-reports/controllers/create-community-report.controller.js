import { createCommunityReport } from '../services/create-community-report.service.js';
import { validateCreateCommunityReport } from '../validation/create-community-report.validation.js';

export function createCommunityReportController(communityReports) {
  return async function submitReport(req, res) {
    const input = validateCreateCommunityReport(req.body);
    const report = await createCommunityReport(input, req.auth.userId, communityReports);
    res.status(201).json({ report });
  };
}
