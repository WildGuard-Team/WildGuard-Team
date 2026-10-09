import { toPublicIncident } from '../mappings/field-incident.mapper.js';

export async function listMyFieldIncidents(rangerUserId, fieldIncidents) {
  const incidents = await fieldIncidents.findByRanger(rangerUserId);
  return incidents.map(toPublicIncident);
}
