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

  import {
    listMyFieldIncidentsController,
  } from '../controllers/list-my-field-incidents.controller.js';
  
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

    const listMyIncidents =
      listMyFieldIncidentsController(fieldIncidents);

    router.get(
      '/mine',
      requireAuthentication(jwtSecret),
      requireParkRanger(users),
      (req, res, next) =>
        Promise.resolve(listMyIncidents(req, res)).catch(next),
    );
  
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
