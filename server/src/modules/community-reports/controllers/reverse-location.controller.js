import { reverseGeocodeLocation } from '../services/reverse-geocoding.service.js';
import { validateCoordinates } from '../validation/location.validation.js';
import { HttpError } from '../../../shared/http-error.js';

export function reverseLocationController(geocoding) {
  return async function reverse(req, res) {
    if (Object.keys(req.query).some((field) => !['latitude', 'longitude'].includes(field))) {
      throw new HttpError(400, 'Only latitude and longitude are allowed for reverse geocoding.');
    }
    const coordinates = validateCoordinates({ latitude: readQueryNumber(req.query.latitude), longitude: readQueryNumber(req.query.longitude) });
    const location = await reverseGeocodeLocation(coordinates, geocoding);
    if (!location) return res.status(200).json({ location: null });
    return res.status(200).json({ location });
  };
}

function readQueryNumber(value) {
  if (typeof value !== 'string') return value;
  const normalized = value.trim();
  if (!/^-?(?:\d+|\d*\.\d+)$/.test(normalized)) return value;
  return Number(normalized);
}
