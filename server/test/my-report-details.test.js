import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import test from 'node:test';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { createAuthToken } from '../src/modules/auth/utils/token.js';
import { CommunityReport } from '../src/modules/community-reports/models/community-report.model.js';
import { createCommunityReportRepository } from '../src/modules/community-reports/repositories/community-report.repository.js';

const owner = new mongoose.Types.ObjectId();
const other = new mongoose.Types.ObjectId();
const jwtSecret = 'report-details-test-secret-longer-than-thirty-two-characters';

function record(overrides = {}) {
  return {
    reporterId: owner,
    clientSubmissionId: randomUUID(),
    referenceNumber: randomUUID(),
    reportType: 'WILDLIFE_SIGHTING',
    description: 'An elephant was seen near the forest entrance. Please review the attached evidence.',
    incidentDateTime: new Date('2026-01-01T10:00:00Z'),
    location: { source: 'MAP', point: { type: 'Point', coordinates: [80.1, 7.2] }, displayName: 'Forest entrance' },
    ...overrides,
  };
}

async function startApi(t, communityReports = createCommunityReportRepository()) {
  const app = createApp({
    clientOrigin: 'http://localhost:3000', isDatabaseConnected: () => true,
    jwtSecret, jwtExpiresIn: '24h', communityReports,
    users: { async findById(id) { return { id, role: 'COMMUNITY_MEMBER' }; } },
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return async (path, { userId = owner, role = 'COMMUNITY_MEMBER', body } = {}) => {
    const headers = userId ? {
      Cookie: `wildguard.token=${createAuthToken({ id: String(userId), role }, jwtSecret, '24h')}`,
    } : {};
    if (body) headers['Content-Type'] = 'application/json';
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/reports${path}`, {
      headers, method: body ? 'POST' : 'GET', body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, body: await response.json(), cacheControl: response.headers.get('cache-control') };
  };
}

test.before(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/wildguard_report_details_test', { serverSelectionTimeoutMS: 5000 });
  await CommunityReport.init();
});

test.after(async () => {
  if (mongoose.connection.readyState === 1) {
    await CommunityReport.deleteMany({ reporterId: { $in: [owner, other] } });
  }
  await mongoose.disconnect();
});

test('owner receives the real report, public coordinates and evidence without internal fields or false status dates', async (t) => {
  const evidence = {
    publicId: 'private-provider-id', secureUrl: 'https://res.cloudinary.com/test-cloud/image/upload/forest.jpg',
    resourceType: 'image', originalName: 'forest.jpg', mimeType: 'image/jpeg', bytes: 32,
    format: 'jpg', width: 640, height: 480,
  };
  const report = await CommunityReport.create(record({ status: 'approved', evidence: [evidence] }));
  const get = await startApi(t);
  const response = await get(`/my-reports/${report.id}`);
  assert.equal(response.status, 200);
  assert.equal(response.cacheControl, 'no-store');
  assert.deepEqual(Object.keys(response.body), ['report']);
  assert.deepEqual(response.body.report, {
    _id: report.id, referenceNumber: report.referenceNumber, reportType: report.reportType,
    description: report.description, status: 'approved', createdAt: report.createdAt.toISOString(),
    incidentDateTime: report.incidentDateTime.toISOString(),
    location: { source: 'MAP', coordinates: { latitude: 7.2, longitude: 80.1 }, displayName: 'Forest entrance', manualLocation: null },
    evidence: [{
      secureUrl: evidence.secureUrl, resourceType: 'image', originalName: 'forest.jpg', mimeType: 'image/jpeg',
      bytes: 32, format: 'jpg', width: 640, height: 480, duration: null,
    }],
  });
  for (const privateField of ['reporterId', 'clientSubmissionId', '__v', 'updatedAt', 'statusUpdatedAt']) {
    assert.equal(Object.hasOwn(response.body.report, privateField), false);
  }
  assert.equal(Object.hasOwn(response.body.report.evidence[0], 'publicId'), false);
});

test('foreign, missing and query-spoofed report lookups are indistinguishable 404s', async (t) => {
  const report = await CommunityReport.create(record());
  const get = await startApi(t);
  const foreign = await get(`/my-reports/${report.id}`, { userId: other });
  const missing = await get(`/my-reports/${new mongoose.Types.ObjectId()}`);
  const spoofed = await get(`/my-reports/${report.id}?reporterId=${owner}`, { userId: other });
  for (const response of [foreign, missing, spoofed]) {
    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { error: { message: 'Report not found.' } });
  }
});

test('invalid IDs return 400 without a repository lookup; authentication and member role remain required', async (t) => {
  let lookups = 0;
  const get = await startApi(t, { async findByIdAndReporter() { lookups += 1; return null; } });
  for (const id of ['invalid', '123456789012', 'g'.repeat(24), '0'.repeat(25), '%7B%22%24ne%22%3Anull%7D']) {
    const response = await get(`/my-reports/${id}`);
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { error: { message: 'Report ID must be a valid MongoDB ObjectId.' } });
  }
  assert.equal(lookups, 0);
  const path = `/my-reports/${new mongoose.Types.ObjectId()}`;
  assert.equal((await get(path, { userId: null })).status, 401);
  assert.equal((await get(path, { role: 'ADMIN' })).status, 403);
  assert.equal(lookups, 0);
});

test('legacy manual reports retain their data and unsafe evidence URLs are excluded', async (t) => {
  const unsafeUrls = ['javascript:alert(1)', 'data:image/png;base64,eA==', 'http://example.test/insecure.png', 'https://user:password@example.test/private.png', 'not-a-url'];
  const legacyRecord = record({
    location: { source: 'MANUAL', manualLocation: 'Forest entrance, Kandy' },
    evidence: unsafeUrls.map((secureUrl) => ({ secureUrl, publicId: 'hidden' })),
  });
  delete legacyRecord.incidentDateTime;
  const legacy = await CommunityReport.collection.insertOne(legacyRecord);
  const get = await startApi(t);
  const response = await get(`/my-reports/${legacy.insertedId}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.report.status, 'under_review');
  assert.equal(response.body.report.createdAt, null);
  assert.equal(response.body.report.incidentDateTime, null);
  assert.deepEqual(response.body.report.location, {
    source: 'MANUAL', coordinates: null, displayName: null, manualLocation: 'Forest entrance, Kandy',
  });
  assert.deepEqual(response.body.report.evidence, []);
  assert.equal((await CommunityReport.collection.findOne({ _id: legacy.insertedId })).status, undefined);
});

test('existing report creation, duplicate-safe retry and my-reports list work alongside the detail route', async (t) => {
  const request = await startApi(t);
  const input = {
    clientSubmissionId: randomUUID(), reportType: 'SUSPICIOUS_ACTIVITY',
    description: 'Suspicious activity was seen beside the reserve entrance.',
    incidentDateTime: '2026-01-01T10:00:00Z', manualLocation: 'Reserve entrance',
  };
  const created = await request('/', { body: input });
  assert.equal(created.status, 201);
  const retried = await request('/', { body: input });
  assert.equal(retried.status, 200);
  assert.equal(retried.body.duplicateRetry, true);
  assert.equal(retried.body.report.id, created.body.report.id);
  const details = await request(`/my-reports/${created.body.report.id}`);
  assert.equal(details.status, 200);
  assert.equal(details.body.report.referenceNumber, created.body.report.referenceNumber);
  assert.deepEqual(details.body.report.evidence, []);
  const list = await request('/my-reports');
  assert.equal(list.status, 200);
  assert.ok(list.body.reports.some((report) => report._id === details.body.report._id));
  assert.equal(await CommunityReport.countDocuments({ reporterId: owner, clientSubmissionId: input.clientSubmissionId }), 1);
});
