import multer from 'multer';

import {
  HttpError,
} from '../../../shared/http-error.js';

import {
  FIELD_INCIDENT_ALLOWED_TYPES,
  FIELD_INCIDENT_EVIDENCE_FIELD,
  FIELD_INCIDENT_EVIDENCE_MAX_FILES,
  FIELD_INCIDENT_VIDEO_MAX_BYTES,
} from '../config/field-incident-evidence.constants.js';

const upload = multer({
  storage:
    multer.memoryStorage(),

  limits: {
    fileSize:
      FIELD_INCIDENT_VIDEO_MAX_BYTES,

    files:
      FIELD_INCIDENT_EVIDENCE_MAX_FILES,
  },

  fileFilter(
    req,
    file,
    callback,
  ) {
    if (
      !FIELD_INCIDENT_ALLOWED_TYPES.includes(
        file.mimetype,
      )
    ) {
      callback(
        new HttpError(
          400,
          'Unsupported evidence file type.',
        ),
      );

      return;
    }

    callback(
      null,
      true,
    );
  },
}).array(
  FIELD_INCIDENT_EVIDENCE_FIELD,
  FIELD_INCIDENT_EVIDENCE_MAX_FILES,
);

function mapMulterError(error) {
  if (
    error instanceof HttpError
  ) {
    return error;
  }

  if (
    !(error instanceof multer.MulterError)
  ) {
    return new HttpError(
      400,
      'Invalid multipart request.',
    );
  }

  if (
    error.code === 'LIMIT_FILE_SIZE'
  ) {
    return new HttpError(
      413,
      'Video files must not exceed 25 MB.',
    );
  }

  if (
    error.code === 'LIMIT_FILE_COUNT'
  ) {
    return new HttpError(
      413,
      'A maximum of 3 evidence files is allowed.',
    );
  }

  if (
    error.code === 'LIMIT_UNEXPECTED_FILE'
  ) {
    return new HttpError(
      400,
      'Only evidence files are allowed.',
    );
  }

  return new HttpError(
    400,
    'Invalid evidence upload.',
  );
}

export function parseFieldIncidentEvidence(
  req,
  res,
  next,
) {
  upload(
    req,
    res,
    (error) => {
      next(
        error
          ? mapMulterError(error)
          : undefined,
      );
    },
  );
}