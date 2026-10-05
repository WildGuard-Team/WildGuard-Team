import { Router } from 'express';
import { requireAuthentication } from '../../auth/middleware/authenticate.middleware.js';
import { requireCommunityMember } from '../middleware/require-community-member.middleware.js';
import { createCommunityReportController } from '../controllers/create-community-report.controller.js';

export function createCommunityReportRouter(communityReports, users, { jwtSecret }) {
  const router = Router();
  const submitReport = createCommunityReportController(communityReports);
  router.post('/', requireAuthentication(jwtSecret), requireCommunityMember(users),
    (req, res, next) => Promise.resolve(submitReport(req, res)).catch(next));
  return router;
}
