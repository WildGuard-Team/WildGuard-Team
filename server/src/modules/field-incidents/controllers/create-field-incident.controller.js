import {
    HttpError,
  } from '../../../shared/http-error.js';
  
  import {
    createFieldIncident,
  } from '../services/create-field-incident.service.js';
  
  import {
    validateCreateFieldIncident,
  } from '../validation/create-field-incident.validation.js';
  
  function normalizeFieldIncidentBody(
    req,
  ) {
    if (
      !req.is(
        'multipart/form-data',
      )
    ) {
      return req.body;
    }
  
    const body = {
      ...req.body,
    };
  
    /*
     * FormData sends nested objects
     * as strings.
     */
    if (
      typeof body.location === 'string'
    ) {
      try {
        body.location =
          JSON.parse(
            body.location,
          );
      } catch {
        throw new HttpError(
          400,
          'Location must be valid JSON.',
        );
      }
    } else if (
      body.location !== undefined
    ) {
      throw new HttpError(
        400,
        'Location must be valid JSON.',
      );
    }
  
    return body;
  }
  
  export function createFieldIncidentController(
    fieldIncidents,
    {
      cloudinary,
      nodeEnv,
    },
  ) {
    return async function submitFieldIncident(
      req,
      res,
    ) {
      const body =
        normalizeFieldIncidentBody(
          req,
        );
  
      const input =
        validateCreateFieldIncident(
          body,
        );
  
      const incident =
        await createFieldIncident(
          input,
          req.parkRanger,
          fieldIncidents,
          req.files ?? [],
          cloudinary,
          nodeEnv,
        );
  
      res
        .status(201)
        .json({
          incident,
  
          message:
            'Field incident submitted successfully.',
        });
    };
  }