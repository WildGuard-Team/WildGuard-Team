import { Router } from 'express';
import { createAuthController } from './controller.js';
import { requireAuthentication } from './middleware.js';

function handle(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
}

export function createAuthRouter(users) {
  const router = Router();
  const controller = createAuthController(users);
  router.post('/register', handle(controller.register));
  router.post('/login', handle(controller.login));
  router.get('/me', requireAuthentication, handle(controller.me));
  router.post('/logout', requireAuthentication, handle(controller.logout));
  return router;
}
