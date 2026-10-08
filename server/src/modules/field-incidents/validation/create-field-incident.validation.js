import {
    HttpError,
  } from '../../../shared/http-error.js';
  
  import {
    FIELD_INCIDENT_TYPES,
    FIELD_INCIDENT_RISK_LEVELS,
    FIELD_INCIDENT_LOCATION_SOURCES,
  } from '../config/field-incident.constants.js';
  
  const allowedFields = new Set([
    'clientIncidentId',
    'incidentType',
    'incidentDateTime',
    'riskLevel',
    'parkZone',
    'blockArea',
    'location',
    'description',
    'additionalNotes',
  ]);
  
  function requiredText(
    value,
    label,
    min,
    max,
  ) {
    const text =
      typeof value === 'string'
        ? value.trim()
        : '';
  
    if (
      text.length < min
      || text.length > max
    ) {
      throw new HttpError(
        400,
        `${label} must be between ${min} and ${max} characters.`,
      );
    }
  
    return text;
  }
  
  function optionalText(
    value,
    label,
    max,
  ) {
    if (
      value === undefined
      || value === null
      || value === ''
    ) {
      return '';
    }
  
    if (
      typeof value !== 'string'
    ) {
      throw new HttpError(
        400,
        `${label} must be text.`,
      );
    }
  
    const text =
      value.trim();
  
    if (
      text.length > max
    ) {
      throw new HttpError(
        400,
        `${label} cannot exceed ${max} characters.`,
      );
    }
  
    return text;
  }
  
  function validateClientIncidentId(
    value,
  ) {
    const clientIncidentId =
      optionalText(
        value,
        'Client incident ID',
        100,
      );
  
    if (!clientIncidentId) {
      return undefined;
    }
  
    return clientIncidentId;
  }
  
  function validateCoordinates(
    value,
  ) {
    if (
      value === undefined
      || value === null
    ) {
      return null;
    }
  
    if (
      typeof value !== 'object'
      || Array.isArray(value)
    ) {
      throw new HttpError(
        400,
        'Location coordinates are invalid.',
      );
    }
  
    const latitude =
      Number(
        value.latitude,
      );
  
    const longitude =
      Number(
        value.longitude,
      );
  
    if (
      !Number.isFinite(latitude)
      || !Number.isFinite(longitude)
      || latitude < -90
      || latitude > 90
      || longitude < -180
      || longitude > 180
    ) {
      throw new HttpError(
        400,
        'Location coordinates are invalid.',
      );
    }
  
    return {
      latitude,
      longitude,
    };
  }
  
  function validateLocation(
    location,
  ) {
    if (
      !location
      || typeof location !== 'object'
      || Array.isArray(location)
    ) {
      throw new HttpError(
        400,
        'Location is required.',
      );
    }
  
    const source =
      typeof location.source === 'string'
        ? location.source
          .trim()
          .toUpperCase()
        : '';
  
    if (
      !FIELD_INCIDENT_LOCATION_SOURCES.includes(
        source,
      )
    ) {
      throw new HttpError(
        400,
        `Location source must be one of: ${FIELD_INCIDENT_LOCATION_SOURCES.join(', ')}.`,
      );
    }
  
    const coordinates =
      validateCoordinates(
        location.coordinates,
      );
  
    const description =
      optionalText(
        location.description,
        'Location description',
        500,
      );
  
    if (
      source === 'GPS'
      && !coordinates
    ) {
      throw new HttpError(
        400,
        'GPS coordinates are required when the location source is GPS.',
      );
    }
  
    if (
      !coordinates
      && !description
    ) {
      throw new HttpError(
        400,
        'Provide GPS coordinates or a location description.',
      );
    }
  
    return {
      source,
      coordinates,
      description,
    };
  }
  
  function validateIncidentDateTime(
    value,
  ) {
    if (
      typeof value !== 'string'
      || !value.trim()
    ) {
      throw new HttpError(
        400,
        'Incident date and time are required.',
      );
    }
  
    const date =
      new Date(value);
  
    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      throw new HttpError(
        400,
        'Incident date and time are invalid.',
      );
    }
  
    return date;
  }
  
  export function validateCreateFieldIncident(
    body,
  ) {
    if (
      !body
      || typeof body !== 'object'
      || Array.isArray(body)
    ) {
      throw new HttpError(
        400,
        'A JSON object is required.',
      );
    }
  
    if (
      Object.keys(body).some(
        (field) =>
          !allowedFields.has(field),
      )
    ) {
      throw new HttpError(
        400,
        'The field incident request contains unsupported fields.',
      );
    }
  
    if (
      !FIELD_INCIDENT_TYPES.includes(
        body.incidentType,
      )
    ) {
      throw new HttpError(
        400,
        `Incident type must be one of: ${FIELD_INCIDENT_TYPES.join(', ')}.`,
      );
    }
  
    if (
      !FIELD_INCIDENT_RISK_LEVELS.includes(
        body.riskLevel,
      )
    ) {
      throw new HttpError(
        400,
        `Risk level must be one of: ${FIELD_INCIDENT_RISK_LEVELS.join(', ')}.`,
      );
    }
  
    return {
      clientIncidentId:
        validateClientIncidentId(
          body.clientIncidentId,
        ),
  
      incidentType:
        body.incidentType,
  
      incidentDateTime:
        validateIncidentDateTime(
          body.incidentDateTime,
        ),
  
      riskLevel:
        body.riskLevel,
  
      parkZone:
        requiredText(
          body.parkZone,
          'Park / Zone',
          2,
          150,
        ),
  
      blockArea:
        requiredText(
          body.blockArea,
          'Block / Area',
          1,
          150,
        ),
  
      location:
        validateLocation(
          body.location,
        ),
  
      description:
        requiredText(
          body.description,
          'Incident description',
          10,
          1000,
        ),
  
      additionalNotes:
        optionalText(
          body.additionalNotes,
          'Additional notes',
          1000,
        ),
    };
  }