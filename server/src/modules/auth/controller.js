import { authenticateMember, getMemberById, registerMember } from './service.js';
import { validateLogin, validateRegistration } from './validation.js';

function regenerateSession(req) {
  return new Promise((resolve, reject) => req.session.regenerate((error) => (error ? reject(error) : resolve())));
}

function destroySession(req) {
  return new Promise((resolve, reject) => req.session.destroy((error) => (error ? reject(error) : resolve())));
}

export function createAuthController(users) {
  return {
    async register(req, res) {
      const user = await registerMember(validateRegistration(req.body), users);
      res.status(201).json({ user });
    },
    async login(req, res) {
      const user = await authenticateMember(validateLogin(req.body), users);
      await regenerateSession(req);
      req.session.userId = user.id;
      res.status(200).json({ user });
    },
    async me(req, res) {
      const user = await getMemberById(req.session.userId, users);
      res.status(200).json({ user });
    },
    async logout(req, res) {
      await destroySession(req);
      res.clearCookie('wildguard.sid');
      res.status(200).json({ message: 'Logged out.' });
    },
  };
}
