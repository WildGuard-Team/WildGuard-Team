import {
    Router,
  } from 'express';
  
  import {
    requireAuthentication,
  } from '../../auth/middleware/authenticate.middleware.js';
  
  import {
    requireParkRanger,
  } from '../middleware/require-park-ranger.middleware.js';
  
  import {
    parseFieldIncidentEvidence,
  } from '../middleware/field-incident-evidence.middleware.js';
  
  import {
    createFieldIncidentController,
  } from '../controllers/create-field-incident.controller.js';
  
  export function createFieldIncidentRouter(
    fieldIncidents,
    users,
    {
      jwtSecret,
      cloudinary,
      nodeEnv,
    },
  ) {
    const router =
      Router();
  
    const submitFieldIncident =
      createFieldIncidentController(
        fieldIncidents,
        {
          cloudinary,
          nodeEnv,
        },
      );
  
    router.post(
      '/',
  
      requireAuthentication(
        jwtSecret,
      ),
  
      requireParkRanger(
        users,
      ),
  
      parseFieldIncidentEvidence,
  
      (req, res, next) =>
        Promise.resolve(
          submitFieldIncident(
            req,
            res,
          ),
        ).catch(next),
    );
  
    return router;
  }