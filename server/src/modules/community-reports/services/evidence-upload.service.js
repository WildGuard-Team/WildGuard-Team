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

function uploadBuffer(cloudinary, file, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        reject(error);
        return;
      }
      if (!result) {
        reject(new Error('Cloudinary returned no upload result.'));
        return;
      }
      resolve(result);
    });
    stream.on('error', reject);
    stream.end(file.buffer);
  });
}

export async function uploadEvidenceFiles(files, cloudinary, onUploaded, nodeEnv = 'production') {
  const resourceTypes = validateEvidenceFiles(files);
  const evidence = [];
  for (const [index, file] of files.entries()) {
    const resourceType = resourceTypes[index];
    let uploaded;
    try {
      uploaded = await uploadBuffer(cloudinary, file, {
        folder: EVIDENCE_CLOUDINARY_FOLDER,
        resource_type: resourceType,
        overwrite: false,
        unique_filename: true,
        use_filename: false,
      });
    } catch (error) {
      if (nodeEnv === 'development') {
        console.error('[Cloudinary upload failure]', {
          name: error?.name ?? null,
          message: error?.message ?? null,
          httpCode: error?.http_code ?? error?.statusCode ?? null,
          code: error?.code ?? null,
          causeName: error?.cause?.name ?? null,
          causeMessage: error?.cause?.message ?? null,
          resourceType,
          mimeType: file?.mimetype ?? null,
          bytes: file?.size ?? null,
        });
      }
      throw error;
    }
    const metadata = toEvidenceMetadata(uploaded, file);
    onUploaded(metadata);
    evidence.push(metadata);
  }
  return evidence;
}
