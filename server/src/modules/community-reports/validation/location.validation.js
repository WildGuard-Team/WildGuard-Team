import { HttpError } from '../../../shared/http-error.js';
import {
  COMMUNITY_REPORT_DISPLAY_NAME_LIMITS,
  COMMUNITY_REPORT_LOCATION_SEARCH_LIMITS,
  COMMUNITY_REPORT_LOCATION_SOURCES,
  COMMUNITY_REPORT_MANUAL_LOCATION_LIMITS,
  COMMUNITY_REPORT_MANUAL_LOCATION_SOURCE,
} from '../config/community-report.constants.js';

const locationFields = new Set(['source', 'coordinates', 'displayName', 'manualLocation']);
const coordinateFields = new Set(['latitude', 'longitude']);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function text(value, label, { min = 0, max }, required = false) {
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'string') throw new HttpError(400, `${label} must be text.`);
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    const range = min ? `between ${min} and ${max}` : `at most ${max}`;
    throw new HttpError(400, `${label} must be ${range} characters.`);
  }
  return normalized;
}

export function validateCoordinates(value) {
  if (!isPlainObject(value) || Object.keys(value).some((field) => !coordinateFields.has(field))) {
    throw new HttpError(400, 'Coordinates must contain only latitude and longitude.');
  }
  const { latitude, longitude } = value;
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new HttpError(400, 'Latitude must be a finite number between -90 and 90.');
  }
  if (typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new HttpError(400, 'Longitude must be a finite number between -180 and 180.');
  }
  return { latitude, longitude };
}

export function validateLocation(location) {
  if (!isPlainObject(location) || Object.keys(location).some((field) => !locationFields.has(field))) {
    throw new HttpError(400, 'Location must be an object with supported location fields only.');
  }
  if (!COMMUNITY_REPORT_LOCATION_SOURCES.includes(location.source)) {
    throw new HttpError(400, `Location source must be one of: ${COMMUNITY_REPORT_LOCATION_SOURCES.join(', ')}.`);
  }
  const coordinates = validateCoordinates(location.coordinates);
  const displayName = text(location.displayName, 'Display name', COMMUNITY_REPORT_DISPLAY_NAME_LIMITS);
  const manualLocation = text(
    location.manualLocation,
    'Manual location',
    COMMUNITY_REPORT_MANUAL_LOCATION_LIMITS,
    location.source === COMMUNITY_REPORT_MANUAL_LOCATION_SOURCE,
  );
  return { source: location.source, coordinates, displayName, manualLocation };
}

export function normalizeLegacyManualLocation(value) {
  const manualLocation = text(value, 'Manual location', COMMUNITY_REPORT_MANUAL_LOCATION_LIMITS, true);
  return {
    source: COMMUNITY_REPORT_MANUAL_LOCATION_SOURCE,
    coordinates: undefined,
    displayName: manualLocation,
    manualLocation,
  };
}

export function validateLocationSearchQuery(value) {
  return text(value, 'Search query', COMMUNITY_REPORT_LOCATION_SEARCH_LIMITS, true);
}
