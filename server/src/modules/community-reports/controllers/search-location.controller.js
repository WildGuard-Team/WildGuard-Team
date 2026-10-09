import { searchLocations } from '../services/location-search.service.js';
import { validateLocationSearchQuery } from '../validation/location.validation.js';
import { HttpError } from '../../../shared/http-error.js';

export function searchLocationController(geocoding) {
  return async function search(req, res) {
    if (Object.keys(req.query).some((field) => field !== 'q')) {
      throw new HttpError(400, 'Only q is allowed for location search.');
    }
    const query = validateLocationSearchQuery(req.query.q);
    const results = await searchLocations(query, geocoding);
    res.status(200).json({ results });
  };
}
