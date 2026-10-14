import {
    FieldIncident,
  } from '../models/field-incident.model.js';
  
  export function createFieldIncidentRepository(
    model = FieldIncident,
  ) {
    return {
      async create(incident) {
        await model.init();
  
        return model.create(
          incident,
        );
      },
  
      findByRanger(
        rangerUserId,
      ) {
        return model
          .find({
            rangerUserId,
          })
          .sort({
            createdAt: -1,
          });
      },
  
      findByReferenceNumber(
        referenceNumber,
      ) {
        return model.findOne({
          referenceNumber,
        });
      },
  
      findByClientIncidentId(
        rangerUserId,
        clientIncidentId,
      ) {
        return model.findOne({
          rangerUserId,
          clientIncidentId,
        });
      },
    };
  }