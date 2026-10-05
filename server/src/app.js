import express from 'express';
import cors from 'cors';
import { errorHandler, notFound } from './middleware/errors.js';
import { requireTrustedOrigin } from './modules/auth/middleware/validate-origin.middleware.js';
import { createUserRepository } from './modules/auth/repositories/user.repository.js';
import { createAuthRouter } from './modules/auth/routes/auth.routes.js';

export function createApp({
  clientOrigin, isDatabaseConnected, jwtSecret, jwtExpiresIn, nodeEnv = 'test', users = createUserRepository(),
}) {
  const app = express();
  app.disable('x-powered-by');
  if (nodeEnv === 'production') app.set('trust proxy', 1);
  app.use(cors({ origin: clientOrigin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(requireTrustedOrigin(clientOrigin));

  app.get('/api/health', (req, res) => {
    const connected = isDatabaseConnected();
    res.set('Cache-Control', 'no-store').status(connected ? 200 : 503).json({
      service: 'wildguard-api',
      status: connected ? 'ok' : 'unavailable',
      database: connected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/auth', createAuthRouter(users, { jwtSecret, jwtExpiresIn, nodeEnv }));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
