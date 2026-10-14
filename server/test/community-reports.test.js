import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { Writable } from 'node:stream';
import test from 'node:test';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { createAuthToken } from '../src/modules/auth/utils/token.js';
import { CommunityReport } from '../src/modules/community-reports/models/community-report.model.js';
import { createCommunityReportRepository } from '../src/modules/community-reports/repositories/community-report.repository.js';
import { createCommunityReport } from '../src/modules/community-reports/services/create-community-report.service.js';
import { validateCreateCommunityReport } from '../src/modules/community-reports/validation/create-community-report.validation.js';

const testUri = 'mongodb://127.0.0.1:27017/wildguard_report_test';
const jwtSecret = 'a-test-secret-that-is-longer-than-thirty-two-characters';
const userIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
const repository = createCommunityReportRepository();

function payload(overrides = {}) {
  return {
    clientSubmissionId: randomUUID(), reportType: 'WILDLIFE_SIGHTING',
    description: 'An elephant was seen near the forest.',
    incidentDateTime: '2026-01-01T10:00:00Z', manualLocation: 'Forest entrance',
    ...overrides,
  };
}

function fakeCloudinary({ fail = false } = {}) {
  const uploaded = [];
  const deleted = [];
  return {
    uploaded, deleted,
    uploader: {
      upload_stream(options, callback) {
        return new Writable({
          write(chunk, encoding, done) { done(); },
          final(done) {
            if (fail) callback(new Error('private provider details'));
            else {
              const asset = {
                public_id: randomUUID(), secure_url: 'https://example.test/evidence.png',
                resource_type: options.resource_type, bytes: 3, format: 'png',
              };
              uploaded.push(asset);
              callback(null, asset);
            }
            done();
          },
        });
      },
      async destroy(publicId) { deleted.push(publicId); },
    },
  };
}

async function startApi(t, communityReports = repository, cloudinary = fakeCloudinary()) {
  const app = createApp({
    clientOrigin: 'http://localhost:3000', isDatabaseConnected: () => true,
    jwtSecret, jwtExpiresIn: '24h', communityReports, cloudinary,
    users: { async findById(id) { return { id, role: 'COMMUNITY_MEMBER' }; } },
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return async (body, userId = userIds[0], multipart = false) => {
    const token = createAuthToken({ id: String(userId), role: 'COMMUNITY_MEMBER' }, jwtSecret, '24h');
    const headers = { Cookie: `wildguard.token=${token}` };
    if (multipart) {
      const form = new FormData();
      for (const [key, value] of Object.entries(body)) form.append(key, value);
      form.append('evidence', new Blob(['png'], { type: 'image/png' }), 'photo.png');
      body = form;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/reports`, {
      method: 'POST', headers, body,
    });
    return { status: response.status, body: await response.json() };
  };
}

test.before(async () => {
  await mongoose.connect(testUri, { serverSelectionTimeoutMS: 5000 });
  await CommunityReport.init();
});

test.after(async () => {
  if (mongoose.connection.readyState === 1) {
    await CommunityReport.deleteMany({ reporterId: { $in: userIds } });
  }
  await mongoose.disconnect();
});

test('new submission is 201; retry is 200 with the same report and one stored record', async (t) => {
  const post = await startApi(t);
  const input = payload();
  const first = await post(input);
  assert.equal(first.status, 201);
  assert.deepEqual(Object.keys(first.body), ['report']);
  assert.match(first.body.report.referenceNumber, /^WG-\d{8}-[A-F0-9]{12}$/);
  const retry = await post({ ...input, clientSubmissionId: `  ${input.clientSubmissionId}  ` });
  assert.equal(retry.status, 200);
  assert.equal(retry.body.duplicateRetry, true);
  assert.deepEqual(retry.body.report, first.body.report);
  assert.equal(await CommunityReport.countDocuments({ clientSubmissionId: input.clientSubmissionId }), 1);
  const stored = await CommunityReport.findById(first.body.report.id);
  assert.equal(String(stored.reporterId), String(userIds[0]));
});

test('two authenticated users can use the same clientSubmissionId', async (t) => {
  const post = await startApi(t);
  const input = payload();
  const results = await Promise.all(userIds.map((id) => post(input, id)));
  assert.deepEqual(results.map((result) => result.status), [201, 201]);
  assert.notEqual(results[0].body.report.id, results[1].body.report.id);
  assert.equal(await CommunityReport.countDocuments({ clientSubmissionId: input.clientSubmissionId }), 2);
});

test('missing, blank, non-string and oversized ids are 400; existing validation still applies', async (t) => {
  const cloudinary = fakeCloudinary();
  const post = await startApi(t, repository, cloudinary);
  for (const clientSubmissionId of [undefined, null, '', '   ', 1, {}, [], 'a'.repeat(101)]) {
    const response = await post(payload({ clientSubmissionId }));
    assert.equal(response.status, 400);
    assert.match(response.body.error.message, /clientSubmissionId/);
  }
  for (const override of [{ description: '' }, { reportType: 'UNKNOWN' }, { incidentDateTime: 'invalid' }, { manualLocation: '' }]) {
    assert.equal((await post(payload(override))).status, 400);
  }
  assert.equal((await post(payload({ reporterId: String(userIds[1]) }))).status, 400);
  assert.equal((await post(payload({ clientSubmissionId: 'a'.repeat(100) }))).status, 201);
  assert.equal(cloudinary.uploaded.length, 0);
});

test('concurrent multipart submissions and later retries upload evidence only once', async (t) => {
  const cloudinary = fakeCloudinary();
  const post = await startApi(t, repository, cloudinary);
  const input = payload();
  const results = await Promise.all(Array.from({ length: 6 }, () => post(input, userIds[0], true)));
  assert.equal(results.filter((result) => result.status === 201).length, 1);
  assert.equal(results.filter((result) => result.status === 200 && result.body.duplicateRetry).length, 5);
  const retry = await post(input, userIds[0], true);
  assert.equal(retry.status, 200);
  for (const result of results) assert.deepEqual(result.body.report, retry.body.report);
  assert.equal(retry.body.report.evidence.length, 1);
  assert.equal(retry.body.report.evidence[0].originalName, 'photo.png');
  assert.equal(cloudinary.uploaded.length, 1);
  assert.equal(cloudinary.deleted.length, 0);
  assert.equal(await CommunityReport.countDocuments({ clientSubmissionId: input.clientSubmissionId }), 1);
});

test('database unique index resolves a race between independent repository instances', async (t) => {
  let arrivals = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let collisions = 0;
  function racingRepository() {
    const repo = createCommunityReportRepository();
    let initialLookup = true;
    return {
      async findBySubmission(...args) {
        const existing = await repo.findBySubmission(...args);
        if (initialLookup) {
          initialLookup = false;
          arrivals += 1;
          if (arrivals === 2) release();
          await gate;
        }
        return existing;
      },
      async create(report) {
        try { return await repo.create(report); }
        catch (error) {
          if (error.code === 11000) collisions += 1;
          throw error;
        }
      },
    };
  }
  const postA = await startApi(t, racingRepository());
  const postB = await startApi(t, racingRepository());
  const input = payload();
  const results = await Promise.all([postA(input), postB(input)]);
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 201]);
  assert.equal(results.find((result) => result.status === 200).body.duplicateRetry, true);
  assert.deepEqual(results[0].body.report, results[1].body.report);
  assert.equal(collisions, 1);
  assert.equal(await CommunityReport.countDocuments({ clientSubmissionId: input.clientSubmissionId }), 1);
});

test('legacy reports can coexist and the new index is scoped to reporterId', async () => {
  const legacy = Array.from({ length: 2 }, () => ({ reporterId: userIds[0], referenceNumber: randomUUID() }));
  await CommunityReport.collection.insertMany(legacy);
  const indexes = await CommunityReport.collection.indexes();
  const submissionIndex = indexes.find((index) => index.key.clientSubmissionId);
  assert.deepEqual(submissionIndex.key, { reporterId: 1, clientSubmissionId: 1 });
  assert.equal(submissionIndex.unique, true);
  assert.deepEqual(submissionIndex.partialFilterExpression, { clientSubmissionId: { $type: 'string' } });
});

test('upload failure is safe, creates no report, and allows the same id to be retried', async (t) => {
  const input = payload();
  const fail = await startApi(t, repository, fakeCloudinary({ fail: true }));
  const response = await fail(input, userIds[0], true);
  assert.equal(response.status, 503);
  assert.deepEqual(response.body, { error: { message: 'Evidence upload is temporarily unavailable.' } });
  assert.equal(await CommunityReport.countDocuments({ clientSubmissionId: input.clientSubmissionId }), 0);
  const post = await startApi(t);
  assert.equal((await post(input, userIds[0], true)).status, 201);
});

test('reference collisions still retry, and failed persistence rolls evidence back', async () => {
  const input = validateCreateCommunityReport(payload());
  const cloudinary = fakeCloudinary();
  const files = [{ buffer: Buffer.from('png'), size: 3, mimetype: 'image/png', originalname: 'photo.png' }];
  let attempts = 0;
  const repo = {
    findBySubmission: (...args) => repository.findBySubmission(...args),
    async create(report) {
      attempts += 1;
      if (attempts === 1) throw { code: 11000, keyPattern: { referenceNumber: 1 } };
      return repository.create(report);
    },
  };
  const result = await createCommunityReport(input, userIds[0], repo, files, cloudinary);
  assert.ok(result.report.id);
  assert.equal(attempts, 2);
  assert.equal(cloudinary.uploaded.length, 1);
  let lookupCount = 0;
  const lateDuplicateRepo = {
    async findBySubmission(...args) {
      lookupCount += 1;
      return lookupCount === 1 ? null : repository.findBySubmission(...args);
    },
    create: (report) => repository.create(report),
  };
  const duplicate = await createCommunityReport(input, userIds[0], lateDuplicateRepo, files, cloudinary);
  assert.equal(duplicate.duplicateRetry, true);
  assert.deepEqual(duplicate.report, result.report);
  assert.deepEqual(cloudinary.deleted, [cloudinary.uploaded[1].public_id]);
  const failingRepo = {
    async findBySubmission() { return null; },
    async create() { throw { code: 11000, message: 'private database details' }; },
  };
  await assert.rejects(createCommunityReport(input, userIds[0], failingRepo, files, cloudinary), {
    status: 500, message: 'The report could not be saved.',
  });
  assert.deepEqual(cloudinary.deleted, cloudinary.uploaded.slice(1).map((asset) => asset.public_id));
});
