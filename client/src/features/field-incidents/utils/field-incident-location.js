import {
  getFieldIncidentCoordinatesError,
  hasValidFieldIncidentCoordinates,
  parseCoordinates,
} from '../validation/field-incident-details.validation.js';

export { getFieldIncidentCoordinatesError, hasValidFieldIncidentCoordinates };

export function formatFieldIncidentCoordinates(coordinates) {
  if (!hasValidFieldIncidentCoordinates(coordinates)) return 'Not provided';
  return `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
}

export function reconcileFieldIncidentLocation(location) {
  const hasSavedCoordinates = hasValidFieldIncidentCoordinates(location.coordinates);

  // API records do not have the form's display text. An explicit empty string,
  // however, represents the Ranger clearing their selected location.
  if (hasSavedCoordinates && location.manualCoordinates == null) {
    return {
      ...location,
      source: location.source === 'GPS' ? 'GPS' : 'MANUAL',
      manualCoordinates: formatFieldIncidentCoordinates(location.coordinates),
    };
  }

  const hasUneditedCoordinates = hasSavedCoordinates
    && location.manualCoordinates === formatFieldIncidentCoordinates(location.coordinates);

  // Map clicks and dragged markers also retain their full numeric precision.
  if (hasUneditedCoordinates) {
    return location.source === 'GPS' || location.source === 'MANUAL'
      ? location
      : { ...location, source: 'MANUAL' };
  }

  const coordinates = parseCoordinates(location.manualCoordinates);
  return {
    ...location,
    coordinates,
    source: coordinates || location.source === 'GPS' ? 'MANUAL' : location.source,
  };
}
