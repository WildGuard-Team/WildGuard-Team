import express from 'express';
import cors from 'cors';
import { errorHandler, notFound } from './middleware/errors.js';
import { requireTrustedOrigin } from './modules/auth/middleware/validate-origin.middleware.js';
import { createUserRepository } from './modules/auth/repositories/user.repository.js';
import { createAuthRouter } from './modules/auth/routes/auth.routes.js';
import { createCommunityReportRepository } from './modules/community-reports/repositories/community-report.repository.js';
import { createCommunityReportRouter } from './modules/community-reports/routes/community-report.routes.js';
import { createGeocodingProvider } from './modules/community-reports/integrations/geocoding.provider.js';
import { createCloudinaryClient } from './config/cloudinary.js';
import { createGeneratedReportRepository } from './modules/conservation-reports/repositories/generated-report.repository.js';
import { createConservationReportRouter } from './modules/conservation-reports/routes/conservation-report.routes.js';
import { createIncidentReportSourceRepository } from './modules/conservation-reports/repositories/incident-report-source.repository.js';
import { createIncidentReportStrategy } from './modules/conservation-reports/services/incident-report.strategy.js';
import { createReportStrategyRegistry } from './modules/conservation-reports/services/report-strategy-registry.js';
import { createPatrolReportSourceRepository } from './modules/conservation-reports/repositories/patrol-report-source.repository.js';
import { createPatrolCoverageReportStrategy } from './modules/conservation-reports/services/patrol-coverage-report.strategy.js';
import { createConflictReportSourceRepository } from './modules/conservation-reports/repositories/conflict-report-source.repository.js';
import { createConflictTrendReportStrategy } from './modules/conservation-reports/services/conflict-trend-report.strategy.js';

export function createApp({
  clientOrigin, isDatabaseConnected, jwtSecret, jwtExpiresIn, nodeEnv = 'test', users = createUserRepository(),
  communityReports = createCommunityReportRepository(),
  conservationReports = createGeneratedReportRepository(),
  incidentReportSources = createIncidentReportSourceRepository(),
  patrolReportSources = createPatrolReportSourceRepository(),
  conflictReportSources = createConflictReportSourceRepository(),
  conservationReportStrategies,
  conservationReportExporter,
  conservationReportPdfExporter,
  geocoding,
  geocodingBaseUrl, geocodingUserAgent, geocodingTimeoutMs,
  cloudinary,
  cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret,
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
  const configuredCloudinary = cloudinary ?? createCloudinaryClient({
    cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret,
  });
  app.use('/api/reports', createCommunityReportRouter(communityReports, users, {
    jwtSecret, geocoding: configuredGeocoding, cloudinary: configuredCloudinary, nodeEnv,
  }));
  const configuredReportStrategies = conservationReportStrategies
    ?? createReportStrategyRegistry([
      createIncidentReportStrategy(incidentReportSources),
      createPatrolCoverageReportStrategy(patrolReportSources),
      createConflictTrendReportStrategy(conflictReportSources),
    ]);
  app.use('/api/conservation-reports', createConservationReportRouter(conservationReports, users, {
    jwtSecret, strategies: configuredReportStrategies,
    exporter: conservationReportExporter, pdfExporter: conservationReportPdfExporter,
  }));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
