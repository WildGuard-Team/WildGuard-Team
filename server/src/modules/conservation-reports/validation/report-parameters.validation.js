import { HttpError } from '../../../shared/http-error.js';
import {
  CONSERVATION_REPORT_MAX_RANGE_DAYS, CONSERVATION_REPORT_TYPE_VALUES,
  REPORT_PARAMETER_FILTERS, REPORT_TYPE_DEFINITIONS,
} from '../config/conservation-report.constants.js';
import { INCIDENT_SEVERITIES, PATROL_STATUSES } from '../config/reporting-data.constants.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CODE_PATTERN = /^[A-Z0-9_-]+$/;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const TOP_LEVEL_FIELDS = Object.freeze(['reportType', 'startDate', 'endDate', 'filters']);

export function validateReportParameters(body) {
  if (!isObject(body)) throw invalid('A JSON object is required.');
  rejectUnknownFields(body, TOP_LEVEL_FIELDS, 'report parameter');

  const reportType = normalizeReportType(body.reportType);
  const startDate = parseDateBoundary(body.startDate, 'startDate', false);
  const endDate = parseDateBoundary(body.endDate, 'endDate', true);
  validateDateRange(startDate, endDate);
  const filters = normalizeFilters(reportType, body.filters);

  return { reportType, startDate, endDate, filters };
}

function normalizeReportType(value) {
  if (!CONSERVATION_REPORT_TYPE_VALUES.includes(value)) {
    throw invalid('Select a valid conservation report type.');
  }
  return value;
}

function parseDateBoundary(value, field, endOfDay) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw invalid(`${field} must use YYYY-MM-DD format.`);
  }
  const time = `${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`;
  const parsed = new Date(time);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw invalid(`${field} must be a valid calendar date.`);
  }
  return parsed;
}

function validateDateRange(startDate, endDate) {
  if (startDate > endDate) throw invalid('Start date must be on or before end date.');
  const inclusiveDays = Math.floor((endDate.getTime() - startDate.getTime()) / MILLISECONDS_PER_DAY) + 1;
  if (inclusiveDays > CONSERVATION_REPORT_MAX_RANGE_DAYS) {
    throw invalid(`Date range cannot exceed ${CONSERVATION_REPORT_MAX_RANGE_DAYS} days.`);
  }
}

function normalizeFilters(reportType, value) {
  const filters = value ?? {};
  if (!isObject(filters)) throw invalid('filters must be an object.');
  rejectUnknownFields(filters, REPORT_PARAMETER_FILTERS, 'filter');

  const definition = REPORT_TYPE_DEFINITIONS.find((item) => item.value === reportType);
  const unsupported = Object.keys(filters).find((key) => !definition.applicableFilters.includes(key));
  if (unsupported) throw invalid(`${unsupported} is not applicable to ${definition.label}.`);

  const normalized = {};
  addTextFilter(normalized, 'park', filters.park, 120);
  addTextFilter(normalized, 'location', filters.location, 160);
  addCodeList(normalized, 'incidentTypes', filters.incidentTypes);
  addEnumList(normalized, 'severities', filters.severities, INCIDENT_SEVERITIES);
  addCodeList(normalized, 'routeSourceIds', filters.routeSourceIds);
  addEnumList(normalized, 'statuses', filters.statuses, PATROL_STATUSES);
  addCodeList(normalized, 'conflictTypes', filters.conflictTypes);
  return normalized;
}

function addTextFilter(target, name, value, maximumLength) {
  if (value === undefined || value === null || value === '') return;
  if (typeof value !== 'string') throw invalid(`${name} must be text.`);
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized || normalized.length > maximumLength) {
    throw invalid(`${name} must be between 1 and ${maximumLength} characters.`);
  }
  target[name] = normalized;
}

function addCodeList(target, name, value) {
  if (value === undefined) return;
  const normalized = normalizeList(name, value);
  if (normalized.some((item) => !CODE_PATTERN.test(item))) {
    throw invalid(`${name} contains an invalid value.`);
  }
  if (normalized.length) target[name] = normalized;
}

function addEnumList(target, name, value, allowedValues) {
  if (value === undefined) return;
  const normalized = normalizeList(name, value);
  if (normalized.some((item) => !allowedValues.includes(item))) {
    throw invalid(`${name} contains an unsupported value.`);
  }
  if (normalized.length) target[name] = normalized;
}

function normalizeList(name, value) {
  if (!Array.isArray(value) || value.length > 50 || value.some((item) => typeof item !== 'string')) {
    throw invalid(`${name} must be an array containing no more than 50 text values.`);
  }
  return [...new Set(value.map((item) => item.trim().toUpperCase()).filter(Boolean))];
}

function rejectUnknownFields(value, allowedFields, label) {
  const unknown = Object.keys(value).find((key) => !allowedFields.includes(key));
  if (unknown) throw invalid(`Unknown ${label}: ${unknown}.`);
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function invalid(message) {
  return new HttpError(400, message);
}
