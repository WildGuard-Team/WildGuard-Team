export const REPORT_TYPES = Object.freeze([
  'WILDLIFE_SIGHTING',
  'HUMAN_WILDLIFE_CONFLICT',
  'SUSPICIOUS_ACTIVITY',
]);
export const DESCRIPTION_LIMITS = Object.freeze({ min: 10, max: 2000 });
export const MANUAL_LOCATION_LIMITS = Object.freeze({ min: 3, max: 300 });
export const MANUAL_LOCATION_SOURCE = 'MANUAL';
export const WEB_REPORT_SOURCE = 'WEB';
export const REFERENCE_MAX_ATTEMPTS = 5;
export const REFERENCE_RANDOM_BYTES = 6;
