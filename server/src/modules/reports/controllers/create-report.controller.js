import { createReport } from '../services/create-report.service.js';
import { validateCreateReport } from '../validation/create-report.validation.js';

export function createReportController(reports) {
  return async function submitReport(req, res) {
    const input = validateCreateReport(req.body);
    const report = await createReport(input, req.auth.userId, reports);
    res.status(201).json({ report });
  };
}
