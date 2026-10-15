import { Router } from 'express';
import { requireAuthentication } from '../../auth/middleware/authenticate.middleware.js';
import { createExportGeneratedReportController } from '../controllers/export-generated-report.controller.js';
import { createExportGeneratedReportPdfController } from '../controllers/export-generated-report-pdf.controller.js';
import { createGetGeneratedReportController } from '../controllers/get-generated-report.controller.js';
import { createGenerateConservationReportController } from '../controllers/generate-conservation-report.controller.js';
import { createListGeneratedReportsController } from '../controllers/list-generated-reports.controller.js';
import { reportOptionsController } from '../controllers/report-options.controller.js';
import { requireParkManager } from '../middleware/require-park-manager.middleware.js';
import { searchLocationController } from '../../community-reports/controllers/search-location.controller.js';

function handle(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
}

export function createConservationReportRouter(reports, users, {
  jwtSecret, strategies, exporter, pdfExporter, geocoding,
}) {
  const router = Router();
  const managerOnly = requireParkManager(users);
  const exportReport = createExportGeneratedReportController(reports, exporter);
  const exportReportPdf = createExportGeneratedReportPdfController(reports, pdfExporter);
  const getReport = createGetGeneratedReportController(reports);
  const listReports = createListGeneratedReportsController(reports);
  const generateReport = createGenerateConservationReportController(reports, strategies);
  const searchLocations = searchLocationController(geocoding);

  router.use(requireAuthentication(jwtSecret), managerOnly);
  router.get('/options', reportOptionsController);
  router.get('/history', handle(listReports));
  router.get('/locations/search', handle(searchLocations));
  router.post('/', handle(generateReport));
  router.get('/:reportId/export/pdf', handle(exportReportPdf));
  router.get('/:reportId/export', handle(exportReport));
  router.get('/:reportId', handle(getReport));
  return router;
}
