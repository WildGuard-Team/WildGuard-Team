import { authenticateMember } from '../services/login.service.js';
import { regenerateSession } from '../services/session.service.js';
import { validateLogin } from '../validation/login.validation.js';

export function createLoginController(users) {
  return async function login(req, res) {
    const user = await authenticateMember(validateLogin(req.body), users);
    await regenerateSession(req.session);
    req.session.userId = user.id;
    res.status(200).json({ user });
  };
}
