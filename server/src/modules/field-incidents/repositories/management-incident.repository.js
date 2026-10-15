import { HttpError } from '../../../shared/http-error.js';

const INCIDENT_TYPE_LABELS = {
  WILDLIFE_SIGHTING: 'Wildlife Sighting',
  POACHING: 'Poaching / Snare',
  INJURED_ANIMAL: 'Injured Animal',
  ANIMAL_CARCASS: 'Animal Carcass',
  ILLEGAL_LOGGING: 'Illegal Logging',
  ILLEGAL_CAMPSITE: 'Illegal Campsite',
  WILDLIFE_CONFLICT: 'Wildlife Conflict',
  OTHER: 'Other',
};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function exactNormalizedText(value) {
  const words = value.trim().split(/\s+/).map(escapeRegex);
  return new RegExp(`^\\s*${words.join('\\s+')}\\s*$`, 'i');
}

// Authorization is based on the authenticated account and the trusted creation
// snapshot. The report's freely entered Park / Zone is only a display filter.
export function managementIncidentScope(manager) {
  if (!manager || (manager.assignedPark != null && typeof manager.assignedPark !== 'string')) {
    throw new HttpError(403, 'Your incident report access could not be verified. Please contact an administrator.');
  }
  // The existing manager role grants all-park access when no park is assigned.
  // A specific assignment narrows that authorization to its trusted snapshot.
  if (!manager.assignedPark?.trim()) return {};
  return { assignedParkSnapshot: exactNormalizedText(manager.assignedPark) };
}

function tableFilters(query) {
  const filters = {};
  for (const field of ['incidentType', 'riskLevel', 'status']) {
    if (query[field]) filters[field] = query[field];
  }
  if (query.parkZone) filters.parkZone = exactNormalizedText(query.parkZone);
  if (query.startDate || query.endDate) {
    filters.incidentDateTime = {
      ...(query.startDate ? { $gte: query.startDate } : {}),
      ...(query.endDate ? { $lt: query.endDate } : {}),
    };
  }
  return filters;
}

function searchFilter(search) {
  const literal = new RegExp(escapeRegex(search), 'i');
  const typeCode = new RegExp(escapeRegex(search.replace(/[\s-]+/g, '_')), 'i');
  const matchedTypes = Object.entries(INCIDENT_TYPE_LABELS)
    .filter(([, label]) => label.toLowerCase().includes(search.toLowerCase()))
    .map(([code]) => code);
  return {
    $or: [
      { referenceNumber: literal },
      { 'ranger.fullName': literal },
      { incidentType: typeCode },
      { incidentType: { $in: matchedTypes } },
    ],
  };
}

const PUBLIC_INCIDENT_FIELDS = {
  referenceNumber: 1, clientIncidentId: 1, rangerIdSnapshot: 1, ranger: 1,
  incidentType: 1, incidentDateTime: 1, riskLevel: 1, parkZone: 1,
  blockArea: 1, location: 1, description: 1, additionalNotes: 1,
  evidence: 1, status: 1, createdAt: 1,
};

export function buildManagementIncidentPipeline(manager, query) {
  const scope = managementIncidentScope(manager);
  const direction = query.sort === 'oldest' ? 1 : -1;
  const results = [
    { $match: tableFilters(query) },
    {
      $lookup: {
        from: 'users',
        localField: 'rangerUserId',
        foreignField: '_id',
        pipeline: [{ $project: { fullName: 1, rangerId: 1 } }],
        as: 'ranger',
      },
    },
    { $set: { ranger: { $arrayElemAt: ['$ranger', 0] } } },
    ...(query.search ? [{ $match: searchFilter(query.search) }] : []),
  ];
  return [
    { $match: scope },
    {
      $facet: {
        statistics: [{
          $group: {
            _id: null,
            total: { $sum: 1 },
            low: { $sum: { $cond: [{ $eq: ['$riskLevel', 'LOW'] }, 1, 0] } },
            medium: { $sum: { $cond: [{ $eq: ['$riskLevel', 'MEDIUM'] }, 1, 0] } },
            high: { $sum: { $cond: [{ $eq: ['$riskLevel', 'HIGH'] }, 1, 0] } },
          },
        }],
        parks: [
          { $match: { parkZone: { $type: 'string', $ne: '' } } },
          { $group: { _id: '$parkZone' } },
          { $sort: { _id: 1 } },
        ],
        incidents: [
          ...results,
          { $sort: { incidentDateTime: direction, createdAt: direction, _id: direction } },
          { $skip: (query.page - 1) * query.pageSize },
          { $limit: query.pageSize },
          { $project: PUBLIC_INCIDENT_FIELDS },
        ],
        filteredTotal: [
          ...(query.search ? results : [{ $match: tableFilters(query) }]),
          { $count: 'count' },
        ],
      },
    },
  ];
}

export async function queryManagementIncidents(model, manager, query) {
  const [result] = await model.aggregate(buildManagementIncidentPipeline(manager, query));
  const statistics = result?.statistics?.[0] ?? {};
  return {
    incidents: result?.incidents ?? [],
    statistics: {
      total: statistics.total ?? 0,
      low: statistics.low ?? 0,
      medium: statistics.medium ?? 0,
      high: statistics.high ?? 0,
    },
    total: result?.filteredTotal?.[0]?.count ?? 0,
    parks: (result?.parks ?? []).map((park) => park._id),
  };
}
