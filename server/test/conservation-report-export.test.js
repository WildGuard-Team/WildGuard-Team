import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { AUTH_TOKEN_COOKIE, PARK_MANAGER } from '../src/modules/auth/config/auth.constants.js';
import { createAuthToken } from '../src/modules/auth/utils/token.js';
import { CONSERVATION_REPORT_TYPES } from '../src/modules/conservation-reports/config/conservation-report.constants.js';
import { exportConservationReportCsv } from '../src/modules/conservation-reports/services/export-conservation-report.service.js';

const clientOrigin = 'http://localhost:3000';
const jwtSecret = 'a-test-secret-that-is-longer-than-thirty-two-characters';
const managerId = new mongoose.Types.ObjectId().toString();
const reportId = 'CR-2026-EXPORT01';

const report = {
  reportId,
  reportType: CONSERVATION_REPORT_TYPES.INCIDENT,
  requestedBy: managerId,
  parameters: {
    startDate: new Date('2026-09-01T00:00:00.000Z'),
    endDate: new Date('2026-09-30T23:59:59.999Z'),
    filters: { park: 'Yala National Park', severities: ['HIGH'] },
  },
  generatedAt: new Date('2026-10-01T08:30:00.000Z'),
  results: {
    summary: { totalIncidents: 2, distinctLocations: 1 },
    incidents: [{
      occurredAt: '2026-09-10T04:00:00.000Z', incidentType: 'WILDLIFE_SIGHTING',
      severity: 'HIGH', park: 'Yala National Park', location: 'Block 1, North', species: 'Elephant',
    }],
  },
  dataProvenance: ['SEEDED_ASSIGNMENT_DATA'],
  fileLocation: `/api/conservation-reports/${reportId}`,
};

test('CSV export contains report metadata, correct totals and escaped record values', () => {
  const csv = exportConservationReportCsv(report);

  assert.match(csv, /"Report ID","CR-2026-EXPORT01"/);
  assert.match(csv, /"totalIncidents","2"/);
  assert.match(csv, /"Block 1, North"/);
  assert.match(csv, /"severities","HIGH"/);
});

test('export failure returns an error while the stored report remains viewable', async (t) => {
  const reports = {
    findByReportIdForManager: async () => report,
  };
  const app = createApp({
    clientOrigin, isDatabaseConnected: () => true, jwtSecret, jwtExpiresIn: '24h',
    users: { findById: async () => ({ id: managerId, role: PARK_MANAGER }) },
    conservationReports: reports,
    conservationReportExporter: async () => { throw new Error('Simulated export failure'); },
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const token = createAuthToken({ id: managerId, role: PARK_MANAGER }, jwtSecret, '24h');
  const headers = { Cookie: `${AUTH_TOKEN_COOKIE}=${token}` };

  const failedExport = await fetch(`${base}/api/conservation-reports/${reportId}/export`, { headers });
  assert.equal(failedExport.status, 500);

  const reportView = await fetch(`${base}/api/conservation-reports/${reportId}`, { headers });
  assert.equal(reportView.status, 200);
  assert.equal((await reportView.json()).report.reportId, reportId);
});
