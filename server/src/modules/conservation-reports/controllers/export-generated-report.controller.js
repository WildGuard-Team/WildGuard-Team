import { getGeneratedReport } from '../services/generated-report.service.js';
import { exportConservationReportCsv } from '../services/export-conservation-report.service.js';

export function createExportGeneratedReportController(
  reports,
  exporter = exportConservationReportCsv,
) {
  return async function exportGeneratedReport(req, res) {
    const report = await getGeneratedReport({
      reportId: req.params.reportId,
      managerId: req.auth.userId,
    }, reports);
    const csv = await exporter(report);
    res
      .set('Cache-Control', 'private, no-store')
      .set('Content-Type', 'text/csv; charset=utf-8')
      .set('Content-Disposition', `attachment; filename="${report.reportId}.csv"`)
      .status(200)
      .send(csv);
  };
}
