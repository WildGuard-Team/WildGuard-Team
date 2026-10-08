import {
    HttpError,
  } from '../../../shared/http-error.js';
  
  import {
    FIELD_INCIDENT_REFERENCE_MAX_ATTEMPTS,
  } from '../config/field-incident.constants.js';
  
  import {
    createFieldIncidentReferenceNumber,
  } from '../utils/reference-number.js';
  
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
  
  function toPublicIncident(incident) {
    const coordinates =
      incident.location?.point
        ?.coordinates;
  
    return {
      id: incident.id,
  
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
        incident.evidence ?? [],
  
      status:
        incident.status,
  
      createdAt:
        incident.createdAt,
    };
  }
  
  export async function createFieldIncident(
    input,
    ranger,
    fieldIncidents,
  ) {
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
  
            evidence: [],
  
            status:
              'SUBMITTED',
          });
  
        return toPublicIncident(
          incident,
        );
      } catch (error) {
        if (
          !isReferenceCollision(error)
        ) {
          throw error;
        }
      }
    }
  
    throw new HttpError(
      500,
      'The field incident could not be saved.',
    );
  }