import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { AUTH_TOKEN_COOKIE, PARK_MANAGER } from '../src/modules/auth/config/auth.constants.js';
import { createAuthToken } from '../src/modules/auth/utils/token.js';
import { CONSERVATION_REPORT_TYPES } from '../src/modules/conservation-reports/config/conservation-report.constants.js';
import { createReportStrategyRegistry } from '../src/modules/conservation-reports/services/report-strategy-registry.js';

const clientOrigin = 'http://localhost:3000';
const jwtSecret = 'a-test-secret-that-is-longer-than-thirty-two-characters';
const managerId = new mongoose.Types.ObjectId().toString();

test('database failure returns a safe generation error', async (t) => {
  const strategies = createReportStrategyRegistry([{
    reportType: CONSERVATION_REPORT_TYPES.INCIDENT,
    generate: async () => ({
      hasData: true,
      results: { summary: { totalIncidents: 1 }, incidents: [] },
      dataProvenance: ['TEST_DATA'],
    }),
  }]);
  const app = createApp({
    clientOrigin, isDatabaseConnected: () => true, jwtSecret, jwtExpiresIn: '24h',
    users: { findById: async () => ({ id: managerId, role: PARK_MANAGER }) },
    conservationReports: { create: async () => { throw new Error('database unavailable'); } },
    conservationReportStrategies: strategies,
  });
  const { base, managerCookie } = await startApp(t, app);

  const response = await fetch(`${base}/api/conservation-reports`, {
    method: 'POST',
    headers: {
      Cookie: managerCookie, Origin: clientOrigin, 'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reportType: CONSERVATION_REPORT_TYPES.INCIDENT,
      startDate: '2026-09-01', endDate: '2026-09-30', filters: {},
    }),
  });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: { message: 'Internal server error.' } });
});

test('expired Park Manager session cannot access reports', async (t) => {
  const app = createApp({
    clientOrigin, isDatabaseConnected: () => true, jwtSecret, jwtExpiresIn: '24h',
    users: { findById: async () => ({ id: managerId, role: PARK_MANAGER }) },
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const expiredToken = createAuthToken({ id: managerId, role: PARK_MANAGER }, jwtSecret, '1ms');
  await new Promise((resolve) => setTimeout(resolve, 10));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/conservation-reports/options`, {
    headers: { Cookie: `${AUTH_TOKEN_COOKIE}=${expiredToken}` },
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: { message: 'Authentication required.' } });
});

async function startApp(t, app) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const token = createAuthToken({ id: managerId, role: PARK_MANAGER }, jwtSecret, '24h');
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    managerCookie: `${AUTH_TOKEN_COOKIE}=${token}`,
  };
}
