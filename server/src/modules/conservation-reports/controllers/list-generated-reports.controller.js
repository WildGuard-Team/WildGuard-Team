import { listGeneratedReports } from '../services/list-generated-reports.service.js';

export function createListGeneratedReportsController(reports) {
  return async function listReports(req, res) {
    const result = await listGeneratedReports({
      managerId: req.auth.userId,
      query: req.query,
    }, reports);
    res.set('Cache-Control', 'private, no-store').status(200).json(result);
  };
}
