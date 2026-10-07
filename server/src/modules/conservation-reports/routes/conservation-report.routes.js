import { Router } from 'express';
import { requireAuthentication } from '../../auth/middleware/authenticate.middleware.js';
import { createGetGeneratedReportController } from '../controllers/get-generated-report.controller.js';
import { createGenerateConservationReportController } from '../controllers/generate-conservation-report.controller.js';
import { reportOptionsController } from '../controllers/report-options.controller.js';
import { requireParkManager } from '../middleware/require-park-manager.middleware.js';

function handle(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
}

export function createConservationReportRouter(reports, users, { jwtSecret, strategies }) {
  const router = Router();
  const managerOnly = requireParkManager(users);
  const getReport = createGetGeneratedReportController(reports);
  const generateReport = createGenerateConservationReportController(reports, strategies);

  router.use(requireAuthentication(jwtSecret), managerOnly);
  router.get('/options', reportOptionsController);
  router.post('/', handle(generateReport));
  router.get('/:reportId', handle(getReport));
  return router;
}
