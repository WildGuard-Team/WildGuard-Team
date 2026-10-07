import { HttpError } from '../../../shared/http-error.js';
import {
  COMMUNITY_REPORT_TYPES, COMMUNITY_REPORT_DESCRIPTION_LIMITS,
} from '../config/community-report.constants.js';
import { normalizeLegacyManualLocation, validateLocation } from './location.validation.js';
import { validateIncidentDateTime } from './incident-date-time.validation.js';

// TODO: Remove the top-level manualLocation compatibility field after the frontend location migration.
const allowedFields = new Set(['clientSubmissionId', 'reportType', 'description', 'incidentDateTime', 'location', 'manualLocation']);

function requiredText(value, label, limits) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length < limits.min || text.length > limits.max) {
    throw new HttpError(400, `${label} must be between ${limits.min} and ${limits.max} characters.`);
  }
  return text;
}

export function validateCreateCommunityReport(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'A JSON object is required.');
  }
  if (Object.keys(body).some((field) => !allowedFields.has(field))) {
    throw new HttpError(400, 'Only clientSubmissionId, reportType, description, incidentDateTime, location, and legacy manualLocation are allowed.');
  }
  if (!COMMUNITY_REPORT_TYPES.includes(body.reportType)) {
    throw new HttpError(400, `Report type must be one of: ${COMMUNITY_REPORT_TYPES.join(', ')}.`);
  }
  if (body.location !== undefined && body.manualLocation !== undefined) {
    throw new HttpError(400, 'Provide either location or legacy manualLocation, not both.');
  }
  return {
    clientSubmissionId: requiredText(body.clientSubmissionId, 'clientSubmissionId', { min: 1, max: 100 }),
    reportType: body.reportType,
    description: requiredText(body.description, 'Description', COMMUNITY_REPORT_DESCRIPTION_LIMITS),
    incidentDateTime: validateIncidentDateTime(body.incidentDateTime),
    location: body.location !== undefined ? validateLocation(body.location) : normalizeLegacyManualLocation(body.manualLocation),
  };
}
