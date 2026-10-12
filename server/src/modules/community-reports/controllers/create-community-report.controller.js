import { createCommunityReport } from '../services/create-community-report.service.js';
import { validateCreateCommunityReport } from '../validation/create-community-report.validation.js';
import { HttpError } from '../../../shared/http-error.js';

export function createCommunityReportController(communityReports, { cloudinary, nodeEnv }) {
  return async function submitReport(req, res) {
    const input = validateCreateCommunityReport(normalizeReportBody(req));
    const result = await createCommunityReport(input, req.auth.userId, communityReports, req.files ?? [], cloudinary, nodeEnv);
    res.status(result.duplicateRetry ? 200 : 201).json(result);
  };
}

function normalizeReportBody(req) {
  if (!req.is('multipart/form-data')) return req.body;
  const body = { ...req.body };
  if (typeof body.location === 'string') {
    try { body.location = JSON.parse(body.location); }
    catch { throw new HttpError(400, 'Location must be valid JSON.'); }
  } else if (body.location !== undefined) {
    throw new HttpError(400, 'Location must be valid JSON.');
  }
  return body;
}
