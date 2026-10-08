import { HttpError } from '../../../shared/http-error.js';
import { FIELD_INCIDENT_REFERENCE_MAX_ATTEMPTS } from '../config/field-incident.constants.js';
import { createFieldIncidentReferenceNumber } from '../utils/reference-number.js';
import {
  toFieldIncidentCreatePayload,
  toPublicIncident,
} from '../mappings/field-incident.mapper.js';
import {
  uploadFieldIncidentEvidence,
  deleteFieldIncidentEvidence,
  validateFieldIncidentEvidence,
} from './field-incident-evidence.service.js';

function isReferenceCollision(error) {
  return error?.code === 11000 && (
    error.keyPattern?.referenceNumber === 1
    || Object.hasOwn(error.keyValue ?? {}, 'referenceNumber')
  );
}

function isClientIncidentCollision(error) {
  return error?.code === 11000 && (
    error.keyPattern?.clientIncidentId === 1
    || Object.hasOwn(error.keyValue ?? {}, 'clientIncidentId')
  );
}

async function rollbackEvidence(evidence, cloudinary, nodeEnv) {
  if (!evidence.length) {
    return;
  }

  try {
    await deleteFieldIncidentEvidence(evidence, cloudinary);
  } catch (error) {
    if (nodeEnv === 'development') {
      console.warn('Field incident evidence rollback failed.', {
        errorName: error?.name,
        errorMessage: error?.message,
      });
    }
  }
}

async function findExistingIncident(fieldIncidents, rangerUserId, clientIncidentId) {
  if (!clientIncidentId) {
    return null;
  }

  return fieldIncidents.findByClientIncidentId(rangerUserId, clientIncidentId);
}

export async function createFieldIncident(
  input,
  ranger,
  fieldIncidents,
  files = [],
  cloudinary,
  nodeEnv = 'production',
) {
  // Validate the complete batch before uploading anything.
  validateFieldIncidentEvidence(files);

  // A previously submitted key must not upload evidence or create another document.
  const existingIncident = await findExistingIncident(
    fieldIncidents,
    ranger.id,
    input.clientIncidentId,
  );

  if (existingIncident) {
    return toPublicIncident(existingIncident);
  }

  let evidence = [];
  try {
    if (files.length) {
      evidence = await uploadFieldIncidentEvidence(files, cloudinary);
    }
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    if (nodeEnv === 'development') {
      console.error('Field incident evidence upload failed.', {
        errorName: error?.name,
        errorMessage: error?.message,
      });
    }

    throw new HttpError(503, 'Evidence upload is temporarily unavailable.');
  }

  for (let attempt = 0; attempt < FIELD_INCIDENT_REFERENCE_MAX_ATTEMPTS; attempt += 1) {
    try {
      const incident = await fieldIncidents.create(toFieldIncidentCreatePayload(
        input,
        ranger,
        evidence,
        createFieldIncidentReferenceNumber(),
      ));

      return toPublicIncident(incident);
    } catch (error) {
      // A concurrent request can win after our initial idempotency lookup.
      if (input.clientIncidentId && isClientIncidentCollision(error)) {
        await rollbackEvidence(evidence, cloudinary, nodeEnv);

        const duplicateIncident = await findExistingIncident(
          fieldIncidents,
          ranger.id,
          input.clientIncidentId,
        );

        if (duplicateIncident) {
          return toPublicIncident(duplicateIncident);
        }

        throw new HttpError(409, 'This field incident has already been submitted.');
      }

      // Reference retries reuse this batch's already uploaded evidence.
      if (isReferenceCollision(error)) {
        continue;
      }

      await rollbackEvidence(evidence, cloudinary, nodeEnv);

      if (error instanceof HttpError) {
        throw error;
      }

      throw new HttpError(500, 'The field incident could not be saved.');
    }
  }

  await rollbackEvidence(evidence, cloudinary, nodeEnv);
  throw new HttpError(500, 'The field incident could not be saved.');
}
