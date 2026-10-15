import { ReportSourceIncident } from '../models/report-source-incident.model.js';
import { containsCaseInsensitive, exactCaseInsensitive } from '../utils/mongo-text-filter.js';

export function createConflictReportSourceRepository(model = ReportSourceIncident) {
  return {
    findForReport(parameters) {
      return model.find(buildConflictQuery(parameters))
        .sort({ occurredAt: 1, sourceId: 1 }).lean();
    },
  };
}

export function buildConflictQuery({ startDate, endDate, filters }) {
  const query = {
    humanWildlifeConflict: true,
    occurredAt: { $gte: startDate, $lte: endDate },
  };
  if (filters.park) query.park = exactCaseInsensitive(filters.park);
  if (filters.location) query.location = containsCaseInsensitive(filters.location);
  if (filters.severities?.length) query.severity = { $in: filters.severities };
  if (filters.conflictTypes?.length) query.conflictType = { $in: filters.conflictTypes };
  return query;
}
