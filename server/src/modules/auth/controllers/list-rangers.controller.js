import { listRangers } from '../services/list-rangers.service.js';

export function createListRangersController(users) {
  return async function getRangers(req, res) {
    const rangers = await listRangers(users);
    res.status(200).json({ rangers });
  };
}
