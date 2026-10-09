import { listMyFieldIncidents } from '../services/list-my-field-incidents.service.js';

export function listMyFieldIncidentsController(fieldIncidents) {
  return async function getMyFieldIncidents(req, res) {
    const incidents = await listMyFieldIncidents(req.parkRanger.id, fieldIncidents);
    res.status(200).json({ incidents });
  };
}
