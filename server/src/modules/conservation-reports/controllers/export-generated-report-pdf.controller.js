import { getGeneratedReport } from '../services/generated-report.service.js';
import { exportConservationReportPdf } from '../services/export-conservation-report-pdf.service.js';

export function createExportGeneratedReportPdfController(
  reports,
  exporter = exportConservationReportPdf,
) {
  return async function exportGeneratedReportPdf(req, res) {
    const report = await getGeneratedReport({
      reportId: req.params.reportId,
      managerId: req.auth.userId,
    }, reports);
    const pdf = await exporter(report);
    res
      .set('Cache-Control', 'private, no-store')
      .set('Content-Type', 'application/pdf')
      .set('Content-Disposition', `attachment; filename="${report.reportId}.pdf"`)
      .status(200)
      .send(pdf);
  };
}
