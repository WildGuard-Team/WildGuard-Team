import {
    randomBytes,
  } from 'node:crypto';
  
  import {
    FIELD_INCIDENT_REFERENCE_RANDOM_BYTES,
  } from '../config/field-incident.constants.js';
  
  export function createFieldIncidentReferenceNumber() {
    const date =
      new Date()
        .toISOString()
        .slice(0, 10)
        .replaceAll('-', '');
  
    const suffix =
      randomBytes(
        FIELD_INCIDENT_REFERENCE_RANDOM_BYTES,
      )
        .toString('hex')
        .toUpperCase();
  
    return `FI-${date}-${suffix}`;
  }