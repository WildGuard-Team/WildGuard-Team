import express from 'express';
import cors from 'cors';
import { errorHandler, notFound } from './middleware/errors.js';

export function createApp({ clientOrigin, isDatabaseConnected }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: clientOrigin }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (req, res) => {
    const connected = isDatabaseConnected();
    res.set('Cache-Control', 'no-store').status(connected ? 200 : 503).json({
      service: 'wildguard-api',
      status: connected ? 'ok' : 'unavailable',
      database: connected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  });

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
