import { ReportSourceIncident } from '../models/report-source-incident.model.js';
import { containsCaseInsensitive, exactCaseInsensitive } from '../utils/mongo-text-filter.js';

export function createIncidentReportSourceRepository(model = ReportSourceIncident) {
  return {
    findForReport(parameters) {
      const query = buildIncidentQuery(parameters);
      return model.find(query).sort({ occurredAt: 1, sourceId: 1 }).lean();
    },
  };
}

export function buildIncidentQuery({ startDate, endDate, filters }) {
  const query = { occurredAt: { $gte: startDate, $lte: endDate } };
  if (filters.park) query.park = exactCaseInsensitive(filters.park);
  if (filters.location) query.location = containsCaseInsensitive(filters.location);
  if (filters.incidentTypes?.length) query.incidentType = { $in: filters.incidentTypes };
  if (filters.severities?.length) query.severity = { $in: filters.severities };
  return query;
}
