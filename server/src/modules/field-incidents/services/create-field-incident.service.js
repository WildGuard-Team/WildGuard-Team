import {
    HttpError,
  } from '../../../shared/http-error.js';
  
  import {
    FIELD_INCIDENT_REFERENCE_MAX_ATTEMPTS,
  } from '../config/field-incident.constants.js';
  
  import {
    createFieldIncidentReferenceNumber,
  } from '../utils/reference-number.js';
  
  import {
    uploadFieldIncidentEvidence,
    deleteFieldIncidentEvidence,
    validateFieldIncidentEvidence,
  } from './field-incident-evidence.service.js';
  
  function isReferenceCollision(error) {
    return (
      error?.code === 11000
      && (
        error.keyPattern?.referenceNumber === 1
        || Object.hasOwn(
          error.keyValue ?? {},
          'referenceNumber',
        )
      )
    );
  }
  
  function toGeoJsonPoint(coordinates) {
    if (!coordinates) {
      return undefined;
    }
  
    return {
      type: 'Point',
  
      coordinates: [
        coordinates.longitude,
        coordinates.latitude,
      ],
    };
  }
  
  function toPublicEvidence(evidence) {
    return {
      secureUrl:
        evidence.secureUrl,
  
      resourceType:
        evidence.resourceType,
  
      originalName:
        evidence.originalName,
  
      mimeType:
        evidence.mimeType,
  
      bytes:
        evidence.bytes,
  
      format:
        evidence.format ?? null,
  
      width:
        evidence.width ?? null,
  
      height:
        evidence.height ?? null,
  
      duration:
        evidence.duration ?? null,
    };
  }
  
  function toPublicIncident(incident) {
    const coordinates =
      incident.location?.point
        ?.coordinates;
  
    return {
      id:
        incident.id,
  
      referenceNumber:
        incident.referenceNumber,
  
      incidentType:
        incident.incidentType,
  
      incidentDateTime:
        incident.incidentDateTime
          ?.toISOString(),
  
      riskLevel:
        incident.riskLevel,
  
      parkZone:
        incident.parkZone,
  
      blockArea:
        incident.blockArea,
  
      location: {
        source:
          incident.location.source,
  
        coordinates:
          coordinates
            ? {
                latitude:
                  coordinates[1],
  
                longitude:
                  coordinates[0],
              }
            : null,
  
        description:
          incident.location.description
          ?? '',
      },
  
      description:
        incident.description,
  
      additionalNotes:
        incident.additionalNotes,
  
      evidence:
        (incident.evidence ?? [])
          .map(toPublicEvidence),
  
      status:
        incident.status,
  
      createdAt:
        incident.createdAt,
    };
  }
  
  async function rollbackEvidence(
    evidence,
    cloudinary,
    nodeEnv,
  ) {
    if (!evidence.length) {
      return;
    }
  
    try {
      await deleteFieldIncidentEvidence(
        evidence,
        cloudinary,
      );
    } catch (error) {
      if (
        nodeEnv === 'development'
      ) {
        console.warn(
          'Field incident evidence rollback failed.',
          {
            errorName:
              error?.name,
  
            errorMessage:
              error?.message,
          },
        );
      }
    }
  }
  
  export async function createFieldIncident(
    input,
    ranger,
    fieldIncidents,
    files = [],
    cloudinary,
    nodeEnv = 'production',
  ) {
    validateFieldIncidentEvidence(
      files,
    );
  
    let evidence = [];
  
    /*
     * Upload evidence first.
     */
    try {
      if (files.length) {
        evidence =
          await uploadFieldIncidentEvidence(
            files,
            cloudinary,
          );
      }
    } catch (error) {
      if (
        error instanceof HttpError
      ) {
        throw error;
      }
  
      if (
        nodeEnv === 'development'
      ) {
        console.error(
          'Field incident evidence upload failed.',
          {
            errorName:
              error?.name,
  
            errorMessage:
              error?.message,
          },
        );
      }
  
      throw new HttpError(
        503,
        'Evidence upload is temporarily unavailable.',
      );
    }
  
    /*
     * Save incident after evidence is uploaded.
     */
    try {
      for (
        let attempt = 0;
        attempt
          < FIELD_INCIDENT_REFERENCE_MAX_ATTEMPTS;
        attempt += 1
      ) {
        try {
          const incident =
            await fieldIncidents.create({
              referenceNumber:
                createFieldIncidentReferenceNumber(),
  
              rangerUserId:
                ranger.id,
  
              rangerIdSnapshot:
                ranger.rangerId,
  
              assignedParkSnapshot:
                ranger.assignedPark,
  
              incidentType:
                input.incidentType,
  
              incidentDateTime:
                input.incidentDateTime,
  
              riskLevel:
                input.riskLevel,
  
              parkZone:
                input.parkZone,
  
              blockArea:
                input.blockArea,
  
              location: {
                source:
                  input.location.source,
  
                point:
                  toGeoJsonPoint(
                    input.location.coordinates,
                  ),
  
                description:
                  input.location.description,
              },
  
              description:
                input.description,
  
              additionalNotes:
                input.additionalNotes,
  
              evidence,
  
              status:
                'SUBMITTED',
            });
  
          return toPublicIncident(
            incident,
          );
        } catch (error) {
          if (
            !isReferenceCollision(
              error,
            )
          ) {
            throw error;
          }
        }
      }
    } catch (error) {
      /*
       * DB failed after Cloudinary upload.
       * Remove uploaded evidence so we
       * do not leave unused assets.
       */
      await rollbackEvidence(
        evidence,
        cloudinary,
        nodeEnv,
      );
  
      if (
        error instanceof HttpError
      ) {
        throw error;
      }
  
      throw new HttpError(
        500,
        'The field incident could not be saved.',
      );
    }
  
    await rollbackEvidence(
      evidence,
      cloudinary,
      nodeEnv,
    );
  
    throw new HttpError(
      500,
      'The field incident could not be saved.',
    );
  }