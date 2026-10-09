export const EVIDENCE_FIELD_NAME = 'evidence';
export const EVIDENCE_MAX_FILES = 3;
export const EVIDENCE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const EVIDENCE_VIDEO_MAX_BYTES = 25 * 1024 * 1024;
export const EVIDENCE_ALLOWED_IMAGE_MIME_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp']);
export const EVIDENCE_ALLOWED_VIDEO_MIME_TYPES = Object.freeze(['video/mp4']);
export const EVIDENCE_ALLOWED_MIME_TYPES = Object.freeze([
  ...EVIDENCE_ALLOWED_IMAGE_MIME_TYPES,
  ...EVIDENCE_ALLOWED_VIDEO_MIME_TYPES,
]);
export const EVIDENCE_CLOUDINARY_FOLDER = 'wildguard/community-reports';
