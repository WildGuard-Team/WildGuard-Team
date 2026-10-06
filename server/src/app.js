import express from 'express';
import cors from 'cors';
import { errorHandler, notFound } from './middleware/errors.js';
import { requireTrustedOrigin } from './modules/auth/middleware/validate-origin.middleware.js';
import { createUserRepository } from './modules/auth/repositories/user.repository.js';
import { createAuthRouter } from './modules/auth/routes/auth.routes.js';
import { createCommunityReportRepository } from './modules/community-reports/repositories/community-report.repository.js';
import { createCommunityReportRouter } from './modules/community-reports/routes/community-report.routes.js';
import { createGeocodingProvider } from './modules/community-reports/integrations/geocoding.provider.js';

export function createApp({
  clientOrigin, isDatabaseConnected, jwtSecret, jwtExpiresIn, nodeEnv = 'test', users = createUserRepository(),
  communityReports = createCommunityReportRepository(),
  geocoding,
  geocodingBaseUrl, geocodingUserAgent, geocodingTimeoutMs,
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
  const configuredGeocoding = geocoding ?? createGeocodingProvider({
    baseUrl: geocodingBaseUrl,
    userAgent: geocodingUserAgent,
    timeoutMs: geocodingTimeoutMs,
    nodeEnv,
  });
  app.use('/api/reports', createCommunityReportRouter(communityReports, users, {
    jwtSecret, geocoding: configuredGeocoding, nodeEnv,
  }));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
