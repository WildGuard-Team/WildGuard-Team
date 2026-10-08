import { Router } from 'express';
import { createCurrentUserController } from '../controllers/current-user.controller.js';
import { createLoginController } from '../controllers/login.controller.js';
import { createLogoutController } from '../controllers/logout.controller.js';
import { createRegisterController } from '../controllers/register.controller.js';
import {
  createRegisterRangerController,
} from '../controllers/register-ranger.controller.js';
import {
  createListPendingRangersController,
} from '../controllers/list-pending-rangers.controller.js';
import {
  createUpdateRangerApprovalController,
} from '../controllers/update-ranger-approval.controller.js';
import {
  requireParkManager,
} from '../middleware/require-park-manager.middleware.js';

import { requireAuthentication } from '../middleware/authenticate.middleware.js';

function handle(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
}

export function createAuthRouter(users, config) {
  const router = Router();
  const register = createRegisterController(users);
  const registerRanger =
  createRegisterRangerController(users);
  const listPendingRangers =
  createListPendingRangersController(users);
  const updateRangerApproval =
  createUpdateRangerApprovalController(users);

const parkManagerOnly =
  requireParkManager(users);
  const login = createLoginController(users, config);
  const currentUser = createCurrentUserController(users);
  const logout = createLogoutController(config);
  
  router.post('/register', handle(register));
  router.post(
    '/register-ranger',
    handle(registerRanger),
  );
  router.post('/login', handle(login));
  router.get('/me', requireAuthentication(config.jwtSecret), handle(currentUser));
  router.get(
    '/rangers/pending',
    requireAuthentication(config.jwtSecret),
    parkManagerOnly,
    handle(listPendingRangers),
  );
  router.patch(
    '/rangers/:userId/approval',
    requireAuthentication(config.jwtSecret),
    parkManagerOnly,
    handle(updateRangerApproval),
  );
  router.post('/logout', requireAuthentication(config.jwtSecret), handle(logout));
  return router;
}
