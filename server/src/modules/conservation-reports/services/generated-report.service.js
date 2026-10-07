import { HttpError } from '../../../shared/http-error.js';

const REPORT_ID_PATTERN = /^[A-Z0-9][A-Z0-9-]{5,63}$/;

export async function getGeneratedReport({ reportId, managerId }, reports) {
  if (typeof reportId !== 'string' || !REPORT_ID_PATTERN.test(reportId)) {
    throw new HttpError(400, 'Invalid conservation report ID.');
  }
  const report = await reports.findByReportIdForManager(reportId, managerId);
  if (!report) throw new HttpError(404, 'Conservation report not found.');
  return toReportView(report);
}

export function toReportView(reportDocument) {
  const report = typeof reportDocument.toObject === 'function'
    ? reportDocument.toObject() : reportDocument;
  return {
    reportId: report.reportId,
    reportType: report.reportType,
    parameters: report.parameters,
    generatedAt: report.generatedAt,
    results: report.results,
    dataProvenance: report.dataProvenance,
    fileLocation: report.fileLocation,
  };
}
