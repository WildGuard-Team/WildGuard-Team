import { destroySession } from '../services/session.service.js';

export function createLogoutController() {
  return async function logout(req, res) {
    await destroySession(req.session);
    res.clearCookie('wildguard.sid');
    res.status(200).json({ message: 'Logged out.' });
  };
}
