import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { COMMUNITY_MEMBER, PARK_MANAGER } from '../src/modules/auth/config/auth.constants.js';
import { AUTH_TOKEN_COOKIE } from '../src/modules/auth/config/auth.constants.js';
import { createAuthToken } from '../src/modules/auth/utils/token.js';
import { CONSERVATION_REPORT_TYPES } from '../src/modules/conservation-reports/config/conservation-report.constants.js';
import { getGeneratedReport } from '../src/modules/conservation-reports/services/generated-report.service.js';
import { createReportStrategyRegistry } from '../src/modules/conservation-reports/services/report-strategy-registry.js';
import { validateReportParameters } from '../src/modules/conservation-reports/validation/report-parameters.validation.js';

const clientOrigin = 'http://localhost:3000';
const jwtSecret = 'a-test-secret-that-is-longer-than-thirty-two-characters';
const managerId = new mongoose.Types.ObjectId().toString();

test('report parameters normalize dates, text, duplicate codes and applicable filters', () => {
  const parameters = validateReportParameters({
    reportType: CONSERVATION_REPORT_TYPES.INCIDENT,
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    filters: {
      park: '  Yala   National Park ',
      incidentTypes: ['wildlife_sighting', 'WILDLIFE_SIGHTING'],
      severities: ['high', 'critical'],
    },
  });

  assert.equal(parameters.startDate.toISOString(), '2026-09-01T00:00:00.000Z');
  assert.equal(parameters.endDate.toISOString(), '2026-09-30T23:59:59.999Z');
  assert.deepEqual(parameters.filters, {
    park: 'Yala National Park',
    incidentTypes: ['WILDLIFE_SIGHTING'],
    severities: ['HIGH', 'CRITICAL'],
  });
});

test('report parameters reject reversed dates, impossible dates and inapplicable filters', () => {
  assert.throws(() => validateReportParameters({
    reportType: CONSERVATION_REPORT_TYPES.PATROL_COVERAGE,
    startDate: '2026-09-30', endDate: '2026-09-01', filters: {},
  }), /Start date/);
  assert.throws(() => validateReportParameters({
    reportType: CONSERVATION_REPORT_TYPES.PATROL_COVERAGE,
    startDate: '2026-02-30', endDate: '2026-03-01', filters: {},
  }), /valid calendar date/);
  assert.throws(() => validateReportParameters({
    reportType: CONSERVATION_REPORT_TYPES.PATROL_COVERAGE,
    startDate: '2026-09-01', endDate: '2026-09-30', filters: { severity: 'HIGH' },
  }), /Unknown filter/);
  assert.throws(() => validateReportParameters({
    reportType: CONSERVATION_REPORT_TYPES.PATROL_COVERAGE,
    startDate: '2026-09-01', endDate: '2026-09-30', filters: { severities: ['HIGH'] },
  }), /not applicable/);
});

test('strategy registry is extensible and rejects invalid or duplicate strategies', () => {
  const incidentStrategy = { reportType: CONSERVATION_REPORT_TYPES.INCIDENT, generate() {} };
  const registry = createReportStrategyRegistry([incidentStrategy]);
  assert.equal(registry.get(CONSERVATION_REPORT_TYPES.INCIDENT), incidentStrategy);
  assert.equal(registry.get(CONSERVATION_REPORT_TYPES.CONFLICT_TREND), null);
  assert.deepEqual(registry.supportedTypes(), [CONSERVATION_REPORT_TYPES.INCIDENT]);
  assert.throws(() => createReportStrategyRegistry([incidentStrategy, incidentStrategy]), /Duplicate/);
  assert.throws(() => createReportStrategyRegistry([{ reportType: 'BROKEN' }]), /requires/);
  assert.throws(() => createReportStrategyRegistry([{ reportType: 'BROKEN', generate() {} }]), /Unsupported/);
});

test('generated report lookup is scoped to the authenticated manager and returns a safe view', async () => {
  let receivedManagerId;
  const reports = {
    async findByReportIdForManager(reportId, requestedBy) {
      receivedManagerId = requestedBy;
      return {
        _id: 'internal', reportId, reportType: CONSERVATION_REPORT_TYPES.INCIDENT,
        parameters: { startDate: new Date('2026-09-01'), endDate: new Date('2026-09-30'), filters: {} },
        generatedAt: new Date('2026-10-01'), results: { total: 4 },
        dataProvenance: ['SEEDED_ASSIGNMENT_DATA'], fileLocation: `/api/conservation-reports/${reportId}`,
      };
    },
  };
  const report = await getGeneratedReport({ reportId: 'CR-2026-ABC123', managerId }, reports);
  assert.equal(receivedManagerId, managerId);
  assert.equal(report.reportId, 'CR-2026-ABC123');
  assert.equal(report._id, undefined);
});

test('conservation report routes require a current Park Manager role', async (t) => {
  const app = createApp({
    clientOrigin, isDatabaseConnected: () => true, jwtSecret, jwtExpiresIn: '24h',
    users: { findById: async () => ({ id: managerId, role: PARK_MANAGER }) },
    conservationReports: { findByReportIdForManager: async () => null },
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;

  assert.equal((await fetch(`${base}/api/conservation-reports/options`)).status, 401);

  const memberToken = createAuthToken({ id: managerId, role: COMMUNITY_MEMBER }, jwtSecret, '24h');
  const forbidden = await fetch(`${base}/api/conservation-reports/options`, {
    headers: { Cookie: `${AUTH_TOKEN_COOKIE}=${memberToken}` },
  });
  assert.equal(forbidden.status, 403);

  const managerToken = createAuthToken({ id: managerId, role: PARK_MANAGER }, jwtSecret, '24h');
  const allowed = await fetch(`${base}/api/conservation-reports/options`, {
    headers: { Cookie: `${AUTH_TOKEN_COOKIE}=${managerToken}` },
  });
  assert.equal(allowed.status, 200);
  const payload = await allowed.json();
  assert.equal(payload.reportTypes.length, 3);
  assert.equal(payload.maximumDateRangeDays, 366);
});
