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
    createFieldIncidentController,
  } from '../controllers/create-field-incident.controller.js';
  
  export function createFieldIncidentRouter(
    fieldIncidents,
    users,
    {
      jwtSecret,
    },
  ) {
    const router = Router();
  
    const submitFieldIncident =
      createFieldIncidentController(
        fieldIncidents,
      );
  
    router.post(
      '/',
      requireAuthentication(
        jwtSecret,
      ),
      requireParkRanger(
        users,
      ),
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