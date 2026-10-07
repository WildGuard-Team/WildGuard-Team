import { Router } from 'express';
import { requireAuthentication } from '../../auth/middleware/authenticate.middleware.js';
import { createExportGeneratedReportController } from '../controllers/export-generated-report.controller.js';
import { createGetGeneratedReportController } from '../controllers/get-generated-report.controller.js';
import { createGenerateConservationReportController } from '../controllers/generate-conservation-report.controller.js';
import { reportOptionsController } from '../controllers/report-options.controller.js';
import { requireParkManager } from '../middleware/require-park-manager.middleware.js';

function handle(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
}

export function createConservationReportRouter(reports, users, { jwtSecret, strategies, exporter }) {
  const router = Router();
  const managerOnly = requireParkManager(users);
  const exportReport = createExportGeneratedReportController(reports, exporter);
  const getReport = createGetGeneratedReportController(reports);
  const generateReport = createGenerateConservationReportController(reports, strategies);

  router.use(requireAuthentication(jwtSecret), managerOnly);
  router.get('/options', reportOptionsController);
  router.post('/', handle(generateReport));
  router.get('/:reportId/export', handle(exportReport));
  router.get('/:reportId', handle(getReport));
  return router;
}
