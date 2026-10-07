import { PatrolRecord } from '../models/patrol-record.model.js';
import { PatrolRoute } from '../models/patrol-route.model.js';
import { exactCaseInsensitive } from '../utils/mongo-text-filter.js';

export function createPatrolReportSourceRepository({
  patrolModel = PatrolRecord, routeModel = PatrolRoute,
} = {}) {
  return {
    findPatrolRecords(parameters) {
      return patrolModel.find(buildPatrolRecordQuery(parameters))
        .sort({ startedAt: 1, sourceId: 1 }).lean();
    },
    findRouteDefinitions(parameters) {
      return routeModel.find(buildPatrolRouteQuery(parameters))
        .sort({ name: 1, sourceId: 1 }).lean();
    },
  };
}

export function buildPatrolRecordQuery({ startDate, endDate, filters }) {
  const query = { startedAt: { $gte: startDate, $lte: endDate } };
  if (filters.park) query.park = exactCaseInsensitive(filters.park);
  if (filters.routeSourceIds?.length) query.routeSourceId = { $in: filters.routeSourceIds };
  if (filters.statuses?.length) query.status = { $in: filters.statuses };
  return query;
}

export function buildPatrolRouteQuery({ filters }) {
  const query = {};
  if (filters.park) query.park = exactCaseInsensitive(filters.park);
  if (filters.routeSourceIds?.length) query.sourceId = { $in: filters.routeSourceIds };
  return query;
}
