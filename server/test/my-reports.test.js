import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app.js';
import { CommunityReport } from '../src/modules/community-reports/models/community-report.model.js';
import { createAuthToken } from '../src/modules/auth/utils/token.js';

test('my reports enforces ownership, filters legacy statuses, sorts and exposes only safe fields', async (t) => {
  await mongoose.connect('mongodb://127.0.0.1:27017/wildguard_my_reports_test', { serverSelectionTimeoutMS: 5000 });
  const owner = new mongoose.Types.ObjectId();
  const other = new mongoose.Types.ObjectId();
  t.after(async () => {
    await CommunityReport.deleteMany({ reporterId: { $in: [owner, other] } });
    await mongoose.disconnect();
  });
  await CommunityReport.init();
  const base = { reporterId: owner, reportType: 'WILDLIFE_SIGHTING', description: 'An elephant near the forest.', location: { source: 'MANUAL', manualLocation: 'Forest entrance' } };
  const legacy = await CommunityReport.collection.insertOne({ ...base, referenceNumber: randomUUID(), createdAt: new Date('2025-01-01') });
  const current = await CommunityReport.create({ ...base, referenceNumber: randomUUID(), clientSubmissionId: randomUUID() });
  assert.equal(current.status, 'under_review');
  for (const status of ['approved', 'rejected']) await CommunityReport.create({ ...base, status, referenceNumber: randomUUID(), clientSubmissionId: randomUUID() });
  const foreign = await CommunityReport.create({ ...base, reporterId: other, referenceNumber: randomUUID(), clientSubmissionId: randomUUID() });
  const secret = 'my-reports-test-secret-longer-than-thirty-two-characters';
  const app = createApp({ clientOrigin: 'http://localhost:3000', isDatabaseConnected: () => true, jwtSecret: secret, jwtExpiresIn: '24h', users: { async findById(id) { return { id, role: 'COMMUNITY_MEMBER' }; } } });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/reports/my-reports`;
  async function get(query = '', id = owner, role = 'COMMUNITY_MEMBER') {
    const headers = id ? { Cookie: `wildguard.token=${createAuthToken({ id: String(id), role }, secret, '24h')}` } : {};
    const response = await fetch(url + query, { headers });
    return { status: response.status, body: await response.json() };
  }
  const all = await get();
  assert.equal(all.status, 200);
  assert.equal(all.body.reports.length, 4);
  assert.equal(all.body.reports.at(-1)._id, String(legacy.insertedId));
  assert.ok(all.body.reports.every((report) => report._id !== foreign.id));
  assert.deepEqual(Object.keys(all.body.reports[0]).sort(), ['_id', 'createdAt', 'description', 'location', 'referenceNumber', 'reportType', 'status']);
  const review = await get('?status=under_review');
  assert.equal(review.body.reports.length, 2);
  assert.ok(review.body.reports.every((report) => report.status === 'under_review'));
  for (const status of ['approved', 'rejected']) assert.equal((await get(`?status=${status}`)).body.reports.length, 1);
  for (const query of ['?status=pending', '?status=', '?status=approved&status=rejected', `?reporterId=${other}`]) assert.equal((await get(query)).status, 400);
  assert.equal((await get('', null)).status, 401);
  assert.equal((await get('', owner, 'ADMIN')).status, 403);
  assert.deepEqual((await get('', new mongoose.Types.ObjectId())).body, { reports: [] });
  assert.equal((await CommunityReport.collection.findOne({ _id: legacy.insertedId })).status, undefined);
});
