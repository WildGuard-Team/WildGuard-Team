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
  
  function isClientIncidentCollision(error) {
    return (
      error?.code === 11000
      && (
        error.keyPattern?.clientIncidentId === 1
        || Object.hasOwn(
          error.keyValue ?? {},
          'clientIncidentId',
        )
      )
    );
  }
  
  function toGeoJsonPoint(
    coordinates,
  ) {
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
  
  function toPublicEvidence(
    evidence,
  ) {
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
  
  function toPublicIncident(
    incident,
  ) {
    const coordinates =
      incident.location?.point
        ?.coordinates;
  
    return {
      id:
        incident.id,
  
      referenceNumber:
        incident.referenceNumber,
  
      clientIncidentId:
        incident.clientIncidentId
        ?? null,
  
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
          .map(
            toPublicEvidence,
          ),
  
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
  
  async function findExistingIncident(
    fieldIncidents,
    rangerUserId,
    clientIncidentId,
  ) {
    if (!clientIncidentId) {
      return null;
    }
  
    return fieldIncidents
      .findByClientIncidentId(
        rangerUserId,
        clientIncidentId,
      );
  }
  
  export async function createFieldIncident(
    input,
    ranger,
    fieldIncidents,
    files = [],
    cloudinary,
    nodeEnv = 'production',
  ) {
    /*
     * Validate evidence before uploading
     * anything to Cloudinary.
     */
    validateFieldIncidentEvidence(
      files,
    );
  
    /*
     * Idempotency check.
     *
     * If this Ranger has already submitted
     * the same clientIncidentId, return the
     * existing incident instead of uploading
     * evidence or creating another document.
     */
    const existingIncident =
      await findExistingIncident(
        fieldIncidents,
        ranger.id,
        input.clientIncidentId,
      );
  
    if (existingIncident) {
      return toPublicIncident(
        existingIncident,
      );
    }
  
    let evidence = [];
  
    /*
     * Upload evidence.
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
     * Save incident.
     */
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
  
            /*
             * Only store a clientIncidentId
             * when the request actually has one.
             */
            ...(input.clientIncidentId
              ? {
                  clientIncidentId:
                    input.clientIncidentId,
                }
              : {}),
  
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
        /*
         * Another request may have submitted
         * the same Ranger + clientIncidentId
         * at exactly the same time.
         */
        if (
          input.clientIncidentId
          && isClientIncidentCollision(
            error,
          )
        ) {
          /*
           * This duplicate request may already
           * have uploaded its own Cloudinary
           * evidence. Remove those unused files.
           */
          await rollbackEvidence(
            evidence,
            cloudinary,
            nodeEnv,
          );
  
          const duplicateIncident =
            await findExistingIncident(
              fieldIncidents,
              ranger.id,
              input.clientIncidentId,
            );
  
          if (duplicateIncident) {
            return toPublicIncident(
              duplicateIncident,
            );
          }
  
          throw new HttpError(
            409,
            'This field incident has already been submitted.',
          );
        }
  
        /*
         * Generated reference number collision:
         * retry using another reference number.
         */
        if (
          isReferenceCollision(
            error,
          )
        ) {
          continue;
        }
  
        /*
         * Database failure after evidence upload.
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
    }
  
    /*
     * All generated reference attempts failed.
     */
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