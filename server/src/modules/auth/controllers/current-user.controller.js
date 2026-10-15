import { getCurrentMember } from '../services/session.service.js';

export function createCurrentUserController(users) {
  return async function currentUser(req, res) {
    const user = await getCurrentMember(req.auth.userId, users);
    res.status(200).json({ user });
  };
}
