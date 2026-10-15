import { PatrolRecord } from '../models/patrol-record.model.js';
import { PatrolRoute } from '../models/patrol-route.model.js';
import { ReportSourceIncident } from '../models/report-source-incident.model.js';

export function createReportingSeedRepository({
  incidentModel = ReportSourceIncident,
  routeModel = PatrolRoute,
  patrolModel = PatrolRecord,
} = {}) {
  return {
    async upsertIncidents(incidents) {
      return upsertBySourceId(incidentModel, incidents);
    },
    async upsertRoutes(routes) {
      return upsertBySourceId(routeModel, routes);
    },
    async upsertPatrols(patrols) {
      return upsertBySourceId(patrolModel, patrols);
    },
  };
}

async function upsertBySourceId(model, records) {
  await model.init();
  const result = await model.bulkWrite(records.map((record) => ({
    updateOne: {
      filter: { sourceId: record.sourceId },
      update: { $set: record },
      upsert: true,
    },
  })), { ordered: false });
  return {
    matched: result.matchedCount,
    modified: result.modifiedCount,
    inserted: result.upsertedCount,
  };
}
