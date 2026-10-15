import { Router } from 'express';
import { requireAuthentication } from '../../auth/middleware/authenticate.middleware.js';
import { requireCommunityMember } from '../middleware/require-community-member.middleware.js';
import { createCommunityReportController } from '../controllers/create-community-report.controller.js';
import { searchLocationController } from '../controllers/search-location.controller.js';
import { reverseLocationController } from '../controllers/reverse-location.controller.js';
import { parseEvidenceUpload } from '../middleware/evidence-upload.middleware.js';
import { myReportsController } from '../controllers/my-reports.controller.js';
import { myReportDetailsController } from '../controllers/my-report-details.controller.js';
import { requireParkManager } from '../../auth/middleware/require-park-manager.middleware.js';
import {
  managerReportDetailsController,
  managerReportsController,
  reviewManagerReportController,
} from '../controllers/manager-reports.controller.js';

export function createCommunityReportRouter(communityReports, users, { jwtSecret, geocoding, cloudinary, nodeEnv }) {
  const router = Router();
  const submitReport = createCommunityReportController(communityReports, { cloudinary, nodeEnv });
  const managerOnly = requireParkManager(users);
  const listManagerReports = managerReportsController(communityReports);
  const managerReportDetails = managerReportDetailsController(communityReports);
  const reviewManagerReport = reviewManagerReportController(communityReports);
  router.get('/manager', requireAuthentication(jwtSecret), managerOnly,
    (req, res, next) => Promise.resolve(listManagerReports(req, res)).catch(next));
  router.get('/manager/:reportId', requireAuthentication(jwtSecret), managerOnly,
    (req, res, next) => Promise.resolve(managerReportDetails(req, res)).catch(next));
  router.patch('/manager/:reportId/status', requireAuthentication(jwtSecret), managerOnly,
    (req, res, next) => Promise.resolve(reviewManagerReport(req, res)).catch(next));
  const myReports = myReportsController(communityReports);
  router.get('/my-reports', requireAuthentication(jwtSecret), requireCommunityMember(users),
    (req, res, next) => Promise.resolve(myReports(req, res)).catch(next));
  const myReportDetails = myReportDetailsController(communityReports);
  router.get('/my-reports/:reportId', requireAuthentication(jwtSecret), requireCommunityMember(users),
    (req, res, next) => Promise.resolve(myReportDetails(req, res)).catch(next));
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
