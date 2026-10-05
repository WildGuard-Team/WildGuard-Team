import { Router } from 'express';
import { requireAuthentication } from '../../auth/middleware/authenticate.middleware.js';
import { requireCommunityMember } from '../middleware/require-community-member.middleware.js';
import { createReportController } from '../controllers/create-report.controller.js';

export function createReportRouter(reports, users, { jwtSecret }) {
  const router = Router();
  const submitReport = createReportController(reports);
  router.post('/', requireAuthentication(jwtSecret), requireCommunityMember(users),
    (req, res, next) => Promise.resolve(submitReport(req, res)).catch(next));
  return router;
}
