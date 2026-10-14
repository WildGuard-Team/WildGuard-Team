import { Router } from 'express';
import { requireAuthentication } from '../../auth/middleware/authenticate.middleware.js';
import { requireCommunityMember } from '../middleware/require-community-member.middleware.js';
import { createCommunityReportController } from '../controllers/create-community-report.controller.js';
import { searchLocationController } from '../controllers/search-location.controller.js';
import { reverseLocationController } from '../controllers/reverse-location.controller.js';
import { parseEvidenceUpload } from '../middleware/evidence-upload.middleware.js';

export function createCommunityReportRouter(communityReports, users, { jwtSecret, geocoding, cloudinary, nodeEnv }) {
  const router = Router();
  const submitReport = createCommunityReportController(communityReports, { cloudinary, nodeEnv });
  const searchLocations = searchLocationController(geocoding);
  const reverseLocation = reverseLocationController(geocoding);
  router.get('/locations/search', requireAuthentication(jwtSecret), requireCommunityMember(users),
    (req, res, next) => Promise.resolve(searchLocations(req, res)).catch(next));
  router.get('/locations/reverse', requireAuthentication(jwtSecret), requireCommunityMember(users),
    (req, res, next) => Promise.resolve(reverseLocation(req, res)).catch(next));
  router.post('/', requireAuthentication(jwtSecret), requireCommunityMember(users),
    parseEvidenceUpload, (req, res, next) => Promise.resolve(submitReport(req, res)).catch(next));
  if (nodeEnv === 'development') console.info('Registered route: GET /api/reports/locations/reverse');
  return router;
}
