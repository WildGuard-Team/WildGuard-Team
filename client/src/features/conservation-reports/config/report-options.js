export const REPORT_TYPES = Object.freeze([
  {
    value: 'INCIDENT_REPORT', title: 'Incident Report', icon: 'incident',
    description: 'Analyse incidents by type, location, severity and time.',
  },
  {
    value: 'PATROL_COVERAGE_REPORT', title: 'Patrol Coverage Report', icon: 'route',
    description: 'Measure patrol activity, route coverage and protected zones.',
  },
  {
    value: 'CONFLICT_TREND_REPORT', title: 'Conflict Trend Report', icon: 'trend',
    description: 'Track human–wildlife conflict patterns and hotspots.',
  },
]);

export const PARKS = Object.freeze([
  'Yala National Park', 'Wilpattu National Park', 'Udawalawe National Park',
]);

export const INCIDENT_TYPES = Object.freeze([
  'WILDLIFE_SIGHTING', 'HUMAN_WILDLIFE_CONFLICT', 'SUSPICIOUS_ACTIVITY', 'INJURED_ANIMAL',
]);
export const SEVERITIES = Object.freeze(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const PATROL_STATUSES = Object.freeze(['COMPLETED', 'CANCELLED']);
export const CONFLICT_TYPES = Object.freeze([
  'CROP_DAMAGE', 'HUMAN_INJURY', 'LIVESTOCK_DEPREDATION', 'PROPERTY_DAMAGE', 'ROAD_OBSTRUCTION',
]);
export const PATROL_ROUTES = Object.freeze([
  { value: 'WG-ROUTE-YA-NORTH', label: 'Northern Boundary Route', park: 'Yala National Park' },
  { value: 'WG-ROUTE-YA-RIVER', label: 'Menik River Route', park: 'Yala National Park' },
  { value: 'WG-ROUTE-WI-EAST', label: 'Eastern Lakes Route', park: 'Wilpattu National Park' },
  { value: 'WG-ROUTE-UD-SOUTH', label: 'Southern Boundary Route', park: 'Udawalawe National Park' },
]);

export function formatOption(value) {
  return value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
