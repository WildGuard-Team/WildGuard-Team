import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { errorHandler, notFound } from './middleware/errors.js';
import { requireTrustedOrigin } from './modules/auth/middleware.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createUserRepository } from './modules/auth/repository.js';

export function createApp({
  clientOrigin, isDatabaseConnected, sessionSecret = 'test-session-secret-that-is-at-least-32-characters',
  sessionTtlHours = 24, nodeEnv = 'test', sessionStore, users = createUserRepository(),
}) {
  const app = express();
  app.disable('x-powered-by');
  if (nodeEnv === 'production') app.set('trust proxy', 1);
  app.use(cors({ origin: clientOrigin }));
  app.use(express.json({ limit: '100kb' }));
  app.use(requireTrustedOrigin(clientOrigin));
  app.use(session({
    name: 'wildguard.sid', secret: sessionSecret, resave: false, saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true, sameSite: 'lax', secure: nodeEnv === 'production',
      maxAge: sessionTtlHours * 60 * 60 * 1000,
    },
  }));

  app.get('/api/health', (req, res) => {
    const connected = isDatabaseConnected();
    res.set('Cache-Control', 'no-store').status(connected ? 200 : 503).json({
      service: 'wildguard-api',
      status: connected ? 'ok' : 'unavailable',
      database: connected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/auth', createAuthRouter(users));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
