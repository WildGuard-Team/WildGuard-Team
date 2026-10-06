import { HttpError } from '../../../shared/http-error.js';
import {
  EVIDENCE_ALLOWED_IMAGE_MIME_TYPES, EVIDENCE_ALLOWED_VIDEO_MIME_TYPES,
  EVIDENCE_CLOUDINARY_FOLDER, EVIDENCE_IMAGE_MAX_BYTES, EVIDENCE_MAX_FILES, EVIDENCE_VIDEO_MAX_BYTES,
} from '../config/evidence.constants.js';
import { toEvidenceMetadata } from '../utils/evidence-mapper.js';

function resourceTypeFor(file) {
  if (EVIDENCE_ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) return 'image';
  if (EVIDENCE_ALLOWED_VIDEO_MIME_TYPES.includes(file.mimetype)) return 'video';
  throw new HttpError(400, 'Unsupported evidence file type.');
}

export function validateEvidenceFiles(files = []) {
  if (files.length > EVIDENCE_MAX_FILES) throw new HttpError(413, 'A maximum of 3 evidence files is allowed.');
  return files.map((file) => {
    if (!file || !Buffer.isBuffer(file.buffer) || file.size < 1) throw new HttpError(400, 'Evidence files must not be empty.');
    const resourceType = resourceTypeFor(file);
    if (resourceType === 'image' && file.size > EVIDENCE_IMAGE_MAX_BYTES) {
      throw new HttpError(413, 'Image files must not exceed 5 MB.');
    }
    if (resourceType === 'video' && file.size > EVIDENCE_VIDEO_MAX_BYTES) {
      throw new HttpError(413, 'Video files must not exceed 25 MB.');
    }
    return resourceType;
  });
}

function uploadBuffer(cloudinary, file, resourceType) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: EVIDENCE_CLOUDINARY_FOLDER,
      resource_type: resourceType,
      overwrite: false,
      unique_filename: true,
      use_filename: false,
    }, (error, result) => (error ? reject(error) : resolve(result)));
    stream.end(file.buffer);
  });
}

export async function uploadEvidenceFiles(files, cloudinary, onUploaded) {
  const resourceTypes = validateEvidenceFiles(files);
  const evidence = [];
  for (const [index, file] of files.entries()) {
    const uploaded = await uploadBuffer(cloudinary, file, resourceTypes[index]);
    const metadata = toEvidenceMetadata(uploaded, file);
    onUploaded(metadata);
    evidence.push(metadata);
  }
  return evidence;
}
