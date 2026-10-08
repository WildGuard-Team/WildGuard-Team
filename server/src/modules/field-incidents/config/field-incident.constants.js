export const FIELD_INCIDENT_TYPES = Object.freeze([
    'WILDLIFE_SIGHTING',
    'POACHING',
    'INJURED_ANIMAL',
    'ANIMAL_CARCASS',
    'ILLEGAL_LOGGING',
    'ILLEGAL_CAMPSITE',
    'WILDLIFE_CONFLICT',
    'OTHER',
  ]);
  
  export const FIELD_INCIDENT_RISK_LEVELS = Object.freeze([
    'LOW',
    'MEDIUM',
    'HIGH',
  ]);
  
  export const FIELD_INCIDENT_LOCATION_SOURCES =
    Object.freeze([
      'GPS',
      'MANUAL',
    ]);
  
  export const FIELD_INCIDENT_STATUS = Object.freeze([
    'SUBMITTED',
  ]);
  
  export const FIELD_INCIDENT_REFERENCE_MAX_ATTEMPTS = 5;
  
  export const FIELD_INCIDENT_REFERENCE_RANDOM_BYTES = 5;