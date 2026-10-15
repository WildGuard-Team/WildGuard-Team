import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { createAuthToken } from '../src/modules/auth/utils/token.js';

const managerId = '0123456789abcdef01234567';
const memberId = 'abcdef0123456789abcdef01';
const reportId = '111111111111111111111111';
const jwtSecret = 'manager-community-report-test-secret-long-enough';

function record(overrides = {}) {
  return {
    _id: reportId,
    referenceNumber: 'WG-20261015-ABCDEF123456',
    reporterId: { _id: memberId, fullName: 'Community Member', email: 'member@example.test' },
    reportType: 'WILDLIFE_SIGHTING',
    description: 'An elephant was seen beside the reserve boundary.',
    location: { source: 'MANUAL', manualLocation: 'Reserve boundary' },
    status: 'under_review',
    createdAt: new Date('2026-10-15T10:00:00.000Z'),
    incidentDateTime: new Date('2026-10-15T09:00:00.000Z'),
    evidence: [],
    ...overrides,
  };
}

async function startApi(t, communityReports) {
  const users = {
    async findById(id) {
      return { id, role: id === managerId ? 'PARK_MANAGER' : 'COMMUNITY_MEMBER' };
    },
  };
  const app = createApp({
    clientOrigin: 'http://localhost:3000', isDatabaseConnected: () => true,
    jwtSecret, jwtExpiresIn: '24h', users, communityReports,
    geocoding: { async search() { return []; }, async reverse() { return null; } },
    cloudinary: { uploader: {} },
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return async (path, { userId = managerId, role = 'PARK_MANAGER', method = 'GET', body } = {}) => {
    const token = userId ? createAuthToken({ id: userId, role }, jwtSecret, '24h') : null;
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/reports${path}`, {
      method,
      headers: {
        ...(token ? { Cookie: `wildguard.token=${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, cacheControl: response.headers.get('cache-control'), body: await response.json() };
  };
}

test('Park Manager can list and inspect community reports with validated filters', async (t) => {
  let receivedFilters;
  const repository = {
    async findForManager(filters) { receivedFilters = filters; return [record()]; },
    async findByIdForManager(id) { assert.equal(id, reportId); return record(); },
  };
  const request = await startApi(t, repository);
  const list = await request('/manager?status=under_review&reportType=WILDLIFE_SIGHTING&search=elephant&startDate=2026-10-01&endDate=2026-10-15');
  assert.equal(list.status, 200);
  assert.equal(list.cacheControl, 'no-store');
  assert.equal(list.body.reports.length, 1);
  assert.deepEqual(list.body.reports[0].reporter, { id: memberId, fullName: 'Community Member', email: 'member@example.test' });
  assert.equal(list.body.reports[0].reporterId, undefined);
  assert.equal(receivedFilters.status, 'under_review');
  assert.equal(receivedFilters.reportType, 'WILDLIFE_SIGHTING');
  assert.equal(receivedFilters.search, 'elephant');
  assert.equal(receivedFilters.startDate.toISOString(), '2026-10-01T00:00:00.000Z');
  assert.equal(receivedFilters.endDate.toISOString(), '2026-10-15T23:59:59.999Z');

  const details = await request(`/manager/${reportId}`);
  assert.equal(details.status, 200);
  assert.deepEqual(details.body.report.evidence, []);
});

test('manager report routes reject unauthenticated, member and invalid requests before data access', async (t) => {
  let reads = 0;
  const request = await startApi(t, {
    async findForManager() { reads += 1; return []; },
    async findByIdForManager() { reads += 1; return null; },
  });
  assert.equal((await request('/manager', { userId: null })).status, 401);
  assert.equal((await request('/manager', { userId: memberId, role: 'COMMUNITY_MEMBER' })).status, 403);
  assert.equal((await request('/manager?status=pending')).status, 400);
  assert.equal((await request('/manager?reportType=UNKNOWN')).status, 400);
  assert.equal((await request('/manager?startDate=2026-10-20&endDate=2026-10-01')).status, 400);
  assert.equal((await request('/manager/not-an-id')).status, 400);
  assert.equal(reads, 0);
});

test('Park Manager approves or rejects an under-review report and rejection requires a reason', async (t) => {
  const updates = [];
  const repository = {
    async updateReviewStatus(id, review) {
      updates.push({ id, review });
      return record({
        status: review.status,
        rejectionReason: review.rejectionReason,
        reviewedAt: review.reviewedAt,
        reviewedBy: { _id: managerId, fullName: 'Park Manager' },
      });
    },
    async findByIdForManager() { return record(); },
  };
  const request = await startApi(t, repository);
  const missingReason = await request(`/manager/${reportId}/status`, { method: 'PATCH', body: { status: 'rejected' } });
  assert.equal(missingReason.status, 400);
  assert.equal(updates.length, 0);

  const rejected = await request(`/manager/${reportId}/status`, { method: 'PATCH', body: { status: 'rejected', rejectionReason: 'The photograph does not show the reported location.' } });
  assert.equal(rejected.status, 200);
  assert.equal(rejected.body.report.status, 'rejected');
  assert.equal(rejected.body.report.rejectionReason, 'The photograph does not show the reported location.');
  assert.equal(updates[0].id, reportId);
  assert.equal(updates[0].review.reviewedBy, managerId);
  assert.ok(updates[0].review.reviewedAt instanceof Date);

  const approved = await request(`/manager/${reportId}/status`, { method: 'PATCH', body: { status: 'approved' } });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.report.status, 'approved');
});

test('a report already reviewed cannot be overwritten by a stale manager screen', async (t) => {
  const repository = {
    async updateReviewStatus() { return null; },
    async findByIdForManager() { return record({ status: 'approved' }); },
  };
  const request = await startApi(t, repository);
  const response = await request(`/manager/${reportId}/status`, { method: 'PATCH', body: { status: 'rejected', rejectionReason: 'Duplicate observation.' } });
  assert.equal(response.status, 409);
  assert.deepEqual(response.body, { error: { message: 'This report has already been reviewed. Refresh to see its current status.' } });
});
