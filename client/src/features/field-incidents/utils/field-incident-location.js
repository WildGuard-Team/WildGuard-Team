import { parseCoordinates } from '../validation/field-incident-details.validation.js';

export function formatFieldIncidentCoordinates(coordinates) {
  if (!coordinates) return 'Not provided';
  return `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
}

export function reconcileFieldIncidentLocation(location) {
  const hasUneditedGps = location.source === 'GPS'
    && location.coordinates
    && location.manualCoordinates === formatFieldIncidentCoordinates(location.coordinates);

  // Keep the original precision only while the displayed GPS value is unchanged.
  if (hasUneditedGps) return location;

  const coordinates = parseCoordinates(location.manualCoordinates);
  return {
    ...location,
    coordinates,
    source: coordinates || location.source === 'GPS' ? 'MANUAL' : location.source,
  };
}
