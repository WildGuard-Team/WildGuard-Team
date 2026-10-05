import { HttpError } from '../../../shared/http-error.js';
import {
  COMMUNITY_REPORT_TYPES, COMMUNITY_REPORT_DESCRIPTION_LIMITS,
  COMMUNITY_REPORT_MANUAL_LOCATION_LIMITS,
} from '../config/community-report.constants.js';

const allowedFields = new Set(['reportType', 'description', 'manualLocation']);

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
    throw new HttpError(400, 'Only reportType, description, and manualLocation are allowed.');
  }
  if (!COMMUNITY_REPORT_TYPES.includes(body.reportType)) {
    throw new HttpError(400, `Report type must be one of: ${COMMUNITY_REPORT_TYPES.join(', ')}.`);
  }
  return {
    reportType: body.reportType,
    description: requiredText(body.description, 'Description', COMMUNITY_REPORT_DESCRIPTION_LIMITS),
    manualLocation: requiredText(body.manualLocation, 'Manual location', COMMUNITY_REPORT_MANUAL_LOCATION_LIMITS),
  };
}
