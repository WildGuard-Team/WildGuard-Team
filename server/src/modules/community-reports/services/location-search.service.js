import { HttpError } from '../../../shared/http-error.js';
import { COMMUNITY_REPORT_LOCATION_SEARCH_LIMITS } from '../config/community-report.constants.js';
import { GeocodingUnavailableError } from '../integrations/geocoding.provider.js';

function providerCoordinate(value, minimum, maximum) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : null;
}

function mapSearchResult(result) {
  if (!result || typeof result !== 'object' || typeof result.display_name !== 'string') return null;
  if (typeof result.place_id !== 'string' && typeof result.place_id !== 'number') return null;
  const latitude = providerCoordinate(result.lat, -90, 90);
  const longitude = providerCoordinate(result.lon, -180, 180);
  if (latitude === null || longitude === null) return null;
  return {
    placeId: String(result.place_id),
    displayName: result.display_name,
    coordinates: { latitude, longitude },
  };
}

export async function searchLocations(query, geocoding) {
  try {
    const payload = await geocoding.search(query, COMMUNITY_REPORT_LOCATION_SEARCH_LIMITS.results);
    if (!Array.isArray(payload)) throw new GeocodingUnavailableError('Invalid geocoding response.');
    return payload.map(mapSearchResult).filter(Boolean).slice(0, COMMUNITY_REPORT_LOCATION_SEARCH_LIMITS.results);
  } catch (error) {
    if (error instanceof GeocodingUnavailableError) {
      throw new HttpError(503, 'Location search is temporarily unavailable.');
    }
    throw error;
  }
}
