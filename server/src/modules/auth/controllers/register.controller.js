import { registerMember } from '../services/register.service.js';
import { validateRegistration } from '../validation/register.validation.js';

export function createRegisterController(users) {
  return async function register(req, res) {
    const user = await registerMember(validateRegistration(req.body), users);
    res.status(201).json({ user });
  };
}
