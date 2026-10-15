import { listManagementIncidents } from '../services/list-management-incidents.service.js';

export function listManagementIncidentsController(fieldIncidents) {
  return async function getManagementIncidents(req, res) {
    const result = await listManagementIncidents(req.parkManager, req.query, fieldIncidents);
    res.status(200).json(result);
  };
}
