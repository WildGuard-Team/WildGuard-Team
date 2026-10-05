import { Router } from 'express';
import { createCurrentUserController } from '../controllers/current-user.controller.js';
import { createLoginController } from '../controllers/login.controller.js';
import { createLogoutController } from '../controllers/logout.controller.js';
import { createRegisterController } from '../controllers/register.controller.js';
import { requireAuthentication } from '../middleware/authenticate.middleware.js';

function handle(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
}

export function createAuthRouter(users, config) {
  const router = Router();
  const register = createRegisterController(users);
  const login = createLoginController(users, config);
  const currentUser = createCurrentUserController(users);
  const logout = createLogoutController(config);

  router.post('/register', handle(register));
  router.post('/login', handle(login));
  router.get('/me', requireAuthentication(config.jwtSecret), handle(currentUser));
  router.post('/logout', requireAuthentication(config.jwtSecret), handle(logout));
  return router;
}
