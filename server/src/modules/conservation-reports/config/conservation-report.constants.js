export const CONSERVATION_REPORT_TYPES = Object.freeze({
  INCIDENT: 'INCIDENT_REPORT',
  PATROL_COVERAGE: 'PATROL_COVERAGE_REPORT',
  CONFLICT_TREND: 'CONFLICT_TREND_REPORT',
});

export const CONSERVATION_REPORT_TYPE_VALUES = Object.freeze(Object.values(CONSERVATION_REPORT_TYPES));
export const CONSERVATION_REPORT_MAX_RANGE_DAYS = 366;
export const CONSERVATION_REPORT_ID_PREFIX = 'CR';

export const REPORT_TYPE_DEFINITIONS = Object.freeze([
  Object.freeze({
    value: CONSERVATION_REPORT_TYPES.INCIDENT,
    label: 'Incident Report',
    applicableFilters: Object.freeze(['park', 'location', 'incidentTypes', 'severities']),
  }),
  Object.freeze({
    value: CONSERVATION_REPORT_TYPES.PATROL_COVERAGE,
    label: 'Patrol Coverage Report',
    applicableFilters: Object.freeze(['park', 'routeSourceIds', 'statuses']),
  }),
  Object.freeze({
    value: CONSERVATION_REPORT_TYPES.CONFLICT_TREND,
    label: 'Conflict Trend Report',
    applicableFilters: Object.freeze(['park', 'location', 'severities', 'conflictTypes']),
  }),
]);

export const REPORT_PARAMETER_FILTERS = Object.freeze([
  'park', 'location', 'incidentTypes', 'severities', 'routeSourceIds', 'statuses', 'conflictTypes',
]);
