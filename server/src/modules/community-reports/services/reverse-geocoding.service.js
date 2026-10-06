import { HttpError } from '../../../shared/http-error.js';
import { GeocodingUnavailableError } from '../integrations/geocoding.provider.js';

function providerCoordinate(value, minimum, maximum) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : null;
}

export async function reverseGeocodeLocation(coordinates, geocoding) {
  try {
    const payload = await geocoding.reverse(coordinates);
    if (payload === null || payload === undefined) return null;
    if (typeof payload !== 'object' || Array.isArray(payload)) {
      throw new GeocodingUnavailableError('Invalid geocoding response.');
    }
    const latitude = providerCoordinate(payload.lat, -90, 90);
    const longitude = providerCoordinate(payload.lon, -180, 180);
    if (typeof payload.display_name !== 'string' || latitude === null || longitude === null) return null;
    return { displayName: payload.display_name, coordinates: { latitude, longitude } };
  } catch (error) {
    if (error instanceof GeocodingUnavailableError) {
      throw new HttpError(503, 'Reverse geocoding is temporarily unavailable.');
    }
    throw error;
  }
}
