import { generateConservationReport } from '../services/generate-conservation-report.service.js';
import { validateReportParameters } from '../validation/report-parameters.validation.js';

export function createGenerateConservationReportController(reports, strategies) {
  return async function generateReport(req, res) {
    const parameters = validateReportParameters(req.body);
    const result = await generateConservationReport({
      parameters,
      managerId: req.auth.userId,
      strategies,
      reports,
    });
    res.set('Cache-Control', 'private, no-store');
    if (result.noData) return res.status(200).json(result);
    return res.status(201).json(result);
  };
}
