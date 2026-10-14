export const FIELD_INCIDENT_EVIDENCE_FIELD =
  'evidence';

export const FIELD_INCIDENT_EVIDENCE_MAX_FILES =
  3;

export const FIELD_INCIDENT_IMAGE_MAX_BYTES =
  5 * 1024 * 1024;

export const FIELD_INCIDENT_VIDEO_MAX_BYTES =
  25 * 1024 * 1024;

export const FIELD_INCIDENT_IMAGE_TYPES =
  Object.freeze([
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);

export const FIELD_INCIDENT_VIDEO_TYPES =
  Object.freeze([
    'video/mp4',
  ]);

export const FIELD_INCIDENT_ALLOWED_TYPES =
  Object.freeze([
    ...FIELD_INCIDENT_IMAGE_TYPES,
    ...FIELD_INCIDENT_VIDEO_TYPES,
  ]);

export const FIELD_INCIDENT_CLOUDINARY_FOLDER =
  'wildguard/field-incidents';