import { toPublicIncident } from '../mappings/field-incident.mapper.js';
import { validateManagementIncidentQuery } from '../validation/list-management-incidents.validation.js';
import { managementIncidentScope } from '../repositories/management-incident.repository.js';

function toManagementIncident(incident) {
  const publicIncident = toPublicIncident({
    ...incident,
    id: String(incident._id ?? incident.id),
    location: incident.location ?? { source: 'MANUAL' },
  });
  const coordinates = publicIncident.location.coordinates;
  if (coordinates && (!Number.isFinite(coordinates.latitude) || !Number.isFinite(coordinates.longitude)
    || Math.abs(coordinates.latitude) > 90 || Math.abs(coordinates.longitude) > 180)) {
    publicIncident.location.coordinates = null;
  }
  return {
    ...publicIncident,
    ranger: {
      id: incident.ranger?._id ? String(incident.ranger._id) : null,
      fullName: incident.ranger?.fullName || incident.rangerIdSnapshot || 'Ranger unavailable',
      rangerId: incident.ranger?.rangerId || incident.rangerIdSnapshot || null,
    },
  };
}

export async function listManagementIncidents(manager, rawQuery, fieldIncidents) {
  managementIncidentScope(manager);
  const query = validateManagementIncidentQuery(rawQuery);
  const result = await fieldIncidents.listForManagement(manager, query);
  return {
    incidents: result.incidents.map(toManagementIncident),
    statistics: result.statistics,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / query.pageSize)),
    },
    filters: { parks: result.parks },
  };
}
