import multer from 'multer';
import { HttpError } from '../../../shared/http-error.js';
import {
  EVIDENCE_ALLOWED_MIME_TYPES, EVIDENCE_FIELD_NAME, EVIDENCE_MAX_FILES, EVIDENCE_VIDEO_MAX_BYTES,
} from '../config/evidence.constants.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: EVIDENCE_VIDEO_MAX_BYTES, files: EVIDENCE_MAX_FILES },
  fileFilter(req, file, callback) {
    if (!EVIDENCE_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return callback(new HttpError(400, 'Unsupported evidence file type.'));
    }
    return callback(null, true);
  },
}).array(EVIDENCE_FIELD_NAME, EVIDENCE_MAX_FILES);

function mapMulterError(error) {
  if (error instanceof HttpError) return error;
  if (!(error instanceof multer.MulterError)) return new HttpError(400, 'Invalid multipart request.');
  if (error.code === 'LIMIT_FILE_SIZE') return new HttpError(413, 'Video files must not exceed 25 MB.');
  if (error.code === 'LIMIT_FILE_COUNT') return new HttpError(413, 'A maximum of 3 evidence files is allowed.');
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return error.field === EVIDENCE_FIELD_NAME
      ? new HttpError(413, 'A maximum of 3 evidence files is allowed.')
      : new HttpError(400, 'Only evidence files are allowed.');
  }
  return new HttpError(400, 'Invalid multipart request.');
}

export function parseEvidenceUpload(req, res, next) {
  upload(req, res, (error) => next(error ? mapMulterError(error) : undefined));
}
