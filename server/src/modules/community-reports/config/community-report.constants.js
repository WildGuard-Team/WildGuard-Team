export const COMMUNITY_REPORT_TYPES = Object.freeze([
  'WILDLIFE_SIGHTING',
  'HUMAN_WILDLIFE_CONFLICT',
  'SUSPICIOUS_ACTIVITY',
]);
export const COMMUNITY_REPORT_DESCRIPTION_LIMITS = Object.freeze({ min: 10, max: 2000 });
export const COMMUNITY_REPORT_MANUAL_LOCATION_LIMITS = Object.freeze({ min: 3, max: 300 });
export const COMMUNITY_REPORT_DISPLAY_NAME_LIMITS = Object.freeze({ max: 300 });
export const COMMUNITY_REPORT_MANUAL_LOCATION_SOURCE = 'MANUAL';
export const COMMUNITY_REPORT_LOCATION_SOURCES = Object.freeze(['GPS', 'MAP', 'MANUAL']);
export const COMMUNITY_REPORT_WEB_SOURCE = 'WEB';
export const COMMUNITY_REPORT_STATUSES = Object.freeze(['under_review', 'approved', 'rejected']);
export const COMMUNITY_REPORT_REFERENCE_MAX_ATTEMPTS = 5;
export const COMMUNITY_REPORT_REFERENCE_RANDOM_BYTES = 6;
export const COMMUNITY_REPORT_LOCATION_SEARCH_LIMITS = Object.freeze({ min: 3, max: 300, results: 5 });
