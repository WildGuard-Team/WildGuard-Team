import { HttpError } from '../../../shared/http-error.js';
import {
  FIELD_INCIDENT_TYPES,
  FIELD_INCIDENT_RISK_LEVELS,
  FIELD_INCIDENT_STATUS,
} from '../config/field-incident.constants.js';

const COLOMBO_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function text(value, field, maximum = 150) {
  if (value === undefined || value === '') return '';
  if (typeof value !== 'string' || value.length > maximum) {
    throw new HttpError(400, `${field} must be text of at most ${maximum} characters.`);
  }
  return value.trim().replace(/\s+/g, ' ');
}

function choice(value, field, options) {
  const normalized = text(value, field).toUpperCase();
  if (normalized && !options.includes(normalized)) {
    throw new HttpError(400, `Choose a valid ${field}.`);
  }
  return normalized;
}

function integer(value, field, fallback, maximum) {
  if (value === undefined || value === '') return fallback;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)
    || !Number.isSafeInteger(Number(value)) || Number(value) > maximum) {
    throw new HttpError(400, `${field} must be a whole number between 1 and ${maximum}.`);
  }
  return Number(value);
}

function dateBoundary(value, field, exclusiveEnd) {
  const normalized = text(value, field, 10);
  if (!normalized) return undefined;
  const timestamp = Date.parse(`${normalized}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || !Number.isFinite(timestamp)
    || new Date(timestamp).toISOString().slice(0, 10) !== normalized) {
    throw new HttpError(400, `${field} must be a valid date in YYYY-MM-DD format.`);
  }
  return new Date(timestamp - COLOMBO_OFFSET_MS + (exclusiveEnd ? DAY_MS : 0));
}

export function validateManagementIncidentQuery(query = {}) {
  const startDate = dateBoundary(query.startDate, 'Start date', false);
  const endDate = dateBoundary(query.endDate, 'End date', true);
  if (startDate && endDate && startDate >= endDate) {
    throw new HttpError(400, 'Start date must be on or before end date.');
  }
  return {
    search: text(query.search, 'Search', 100),
    incidentType: choice(query.incidentType, 'incident type', FIELD_INCIDENT_TYPES),
    riskLevel: choice(query.riskLevel, 'risk level', FIELD_INCIDENT_RISK_LEVELS),
    parkZone: text(query.parkZone, 'Park / Zone'),
    status: choice(query.status, 'report status', FIELD_INCIDENT_STATUS),
    startDate,
    endDate,
    page: integer(query.page, 'Page', 1, 1000000),
    pageSize: integer(query.pageSize, 'Page size', 25, 100),
    sort: choice(query.sort, 'sort order', ['NEWEST', 'OLDEST']).toLowerCase() || 'newest',
  };
}
