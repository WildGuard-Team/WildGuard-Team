import { validateIncidentDateTime } from './incidentDateTime.validation.js';

const DESCRIPTION_LIMITS = { min: 10, max: 2000 };
const MANUAL_LOCATION_LIMITS = { min: 3, max: 300 };

function hasValidCoordinates(coordinates) {
  return coordinates && typeof coordinates.latitude === 'number' && Number.isFinite(coordinates.latitude)
    && coordinates.latitude >= -90 && coordinates.latitude <= 90
    && typeof coordinates.longitude === 'number' && Number.isFinite(coordinates.longitude)
    && coordinates.longitude >= -180 && coordinates.longitude <= 180;
}

export function validateReportDetails({ description, location, incidentDateTime }) {
  const errors = {};
  const dateError = validateIncidentDateTime(incidentDateTime);
  if (dateError) errors.incidentDateTime = dateError;
  const normalizedDescription = typeof description === 'string' ? description.trim() : '';
  if (normalizedDescription.length < DESCRIPTION_LIMITS.min || normalizedDescription.length > DESCRIPTION_LIMITS.max) {
    errors.description = 'Description must be between 10 and 2,000 characters.';
  }
  if (!location?.source) errors.location = 'Choose a location on the map, search for one, or use your current location.';
  else if (!hasValidCoordinates(location.coordinates)) errors.location = 'Select valid coordinates before continuing.';
  if (location?.source === 'MANUAL') {
    const manualLocation = typeof location.manualLocation === 'string' ? location.manualLocation.trim() : '';
    if (manualLocation.length < MANUAL_LOCATION_LIMITS.min || manualLocation.length > MANUAL_LOCATION_LIMITS.max) {
      errors.manualLocation = 'Manual location must be between 3 and 300 characters.';
    }
  }
  return errors;
}
