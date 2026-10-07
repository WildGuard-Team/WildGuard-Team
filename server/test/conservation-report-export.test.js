import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { AUTH_TOKEN_COOKIE, PARK_MANAGER } from '../src/modules/auth/config/auth.constants.js';
import { createAuthToken } from '../src/modules/auth/utils/token.js';
import { CONSERVATION_REPORT_TYPES } from '../src/modules/conservation-reports/config/conservation-report.constants.js';
import { exportConservationReportCsv } from '../src/modules/conservation-reports/services/export-conservation-report.service.js';
import { exportConservationReportPdf } from '../src/modules/conservation-reports/services/export-conservation-report-pdf.service.js';

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

test('PDF export creates a valid document for direct download', async () => {
  const pdf = await exportConservationReportPdf(report);

  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.ok(pdf.length > 10_000);
});

test('PDF export supports Patrol Coverage and Conflict Trend report content', async () => {
  const patrolReport = {
    ...report,
    reportType: CONSERVATION_REPORT_TYPES.PATROL_COVERAGE,
    results: {
      summary: { totalPatrols: 2, completedPatrols: 1, routeCoveragePercent: 50 },
      dataSource: { label: 'Seeded patrol assessment dataset' },
      breakdowns: {
        byDate: [{ label: '2026-09-01', distanceKm: 12 }],
        byStatus: [{ label: 'COMPLETED', count: 1 }],
        byRoute: [{ routeName: 'North Route', completedPatrols: 1 }],
      },
      patrols: [{
        startedAt: '2026-09-01T04:00:00.000Z', routeName: 'North Route', rangerTeam: 'Alpha',
        status: 'COMPLETED', distanceKm: 12, zonesCovered: ['Zone A'],
      }],
    },
  };
  const conflictReport = {
    ...report,
    reportType: CONSERVATION_REPORT_TYPES.CONFLICT_TREND,
    results: {
      summary: { totalConflicts: 1, topHotspot: { label: 'Buffer Zone', count: 1 } },
      timeGranularity: 'WEEK',
      breakdowns: {
        byTime: [{ label: '01 Sep', count: 1 }],
        byConflictType: [{ label: 'CROP_DAMAGE', count: 1 }],
        byLocation: [{ label: 'Buffer Zone', count: 1 }],
        bySpecies: [{ label: 'Elephant', count: 1 }],
      },
      conflicts: [{
        occurredAt: '2026-09-02T04:00:00.000Z', conflictType: 'CROP_DAMAGE', severity: 'HIGH',
        park: 'Yala National Park', location: 'Buffer Zone', species: 'Elephant',
      }],
    },
  };

  const outputs = await Promise.all([
    exportConservationReportPdf(patrolReport), exportConservationReportPdf(conflictReport),
  ]);
  outputs.forEach((pdf) => assert.equal(pdf.subarray(0, 5).toString(), '%PDF-'));
});

test('authenticated PDF endpoint returns attachment headers and PDF content', async (t) => {
  const app = createApp({
    clientOrigin, isDatabaseConnected: () => true, jwtSecret, jwtExpiresIn: '24h',
    users: { findById: async () => ({ id: managerId, role: PARK_MANAGER }) },
    conservationReports: { findByReportIdForManager: async () => report },
    conservationReportPdfExporter: async () => Buffer.from('%PDF-test-content'),
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const token = createAuthToken({ id: managerId, role: PARK_MANAGER }, jwtSecret, '24h');

  const response = await fetch(`${base}/api/conservation-reports/${reportId}/export/pdf`, {
    headers: { Cookie: `${AUTH_TOKEN_COOKIE}=${token}` },
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/pdf');
  assert.match(response.headers.get('content-disposition'), /CR-2026-EXPORT01\.pdf/);
  assert.equal(Buffer.from(await response.arrayBuffer()).toString(), '%PDF-test-content');
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
    conservationReportPdfExporter: async () => { throw new Error('Simulated PDF export failure'); },
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const token = createAuthToken({ id: managerId, role: PARK_MANAGER }, jwtSecret, '24h');
  const headers = { Cookie: `${AUTH_TOKEN_COOKIE}=${token}` };

  const failedExport = await fetch(`${base}/api/conservation-reports/${reportId}/export`, { headers });
  assert.equal(failedExport.status, 500);

  const failedPdfExport = await fetch(`${base}/api/conservation-reports/${reportId}/export/pdf`, { headers });
  assert.equal(failedPdfExport.status, 500);

  const reportView = await fetch(`${base}/api/conservation-reports/${reportId}`, { headers });
  assert.equal(reportView.status, 200);
  assert.equal((await reportView.json()).report.reportId, reportId);
});
