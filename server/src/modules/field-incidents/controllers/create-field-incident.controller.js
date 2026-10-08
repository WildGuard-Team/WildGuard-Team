import {
    createFieldIncident,
  } from '../services/create-field-incident.service.js';
  
  import {
    validateCreateFieldIncident,
  } from '../validation/create-field-incident.validation.js';
  
  export function createFieldIncidentController(
    fieldIncidents,
  ) {
    return async function submitFieldIncident(
      req,
      res,
    ) {
      const input =
        validateCreateFieldIncident(
          req.body,
        );
  
      const incident =
        await createFieldIncident(
          input,
          req.parkRanger,
          fieldIncidents,
        );
  
      res.status(201).json({
        incident,
  
        message:
          'Field incident submitted successfully.',
      });
    };
  }