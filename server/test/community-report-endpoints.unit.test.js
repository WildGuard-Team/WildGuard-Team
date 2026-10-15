import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import { createApp } from '../src/app.js';
import { createAuthToken } from '../src/modules/auth/utils/token.js';
import { GeocodingUnavailableError } from '../src/modules/community-reports/integrations/geocoding.provider.js';
import { EVIDENCE_VIDEO_MAX_BYTES } from '../src/modules/community-reports/config/evidence.constants.js';

const owner = '0123456789abcdef01234567';
const foreign = 'abcdef0123456789abcdef01';
const secret = 'community-report-endpoint-unit-test-secret-long-enough';
const payload = () => ({ clientSubmissionId: 'submission-1', reportType: 'WILDLIFE_SIGHTING', description: 'Elephants seen near the forest.', incidentDateTime: '2024-01-01T10:00:00Z', location: { source: 'MAP', coordinates: { latitude: 7, longitude: 80 }, displayName: 'Kandy' } });
const document = (overrides = {}) => ({ _id: foreign, id: foreign, referenceNumber: 'WG-20240101-ABCDEF123456', ...payload(), incidentDateTime: new Date('2024-01-01T10:00:00Z'), source: 'WEB', createdAt: new Date('2024-01-02'), location: { source: 'MAP', point: { type: 'Point', coordinates: [80, 7] } }, ...overrides });

async function api(t, { communityReports = { async findBySubmission() { return null; }, async create(data) { return document(data); }, async findByReporter() { return []; }, async findByIdAndReporter() { return null; } }, users = { async findById(id) { return { id, role: 'COMMUNITY_MEMBER' }; } }, geocoding = { async search() { return []; }, async reverse() { return null; } } } = {}) {
  const app = createApp({ clientOrigin: 'http://localhost:3000', isDatabaseConnected: () => true, jwtSecret: secret, jwtExpiresIn: '24h', communityReports, users, geocoding, cloudinary: { uploader: {} } });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return async (path, { id = owner, role = 'COMMUNITY_MEMBER', headers = {}, ...init } = {}) => {
    const token = id === null ? null : createAuthToken({ id, role }, secret, '24h');
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/reports${path}`, { ...init, headers: { ...(token ? { Cookie: `wildguard.token=${token}` } : {}), ...headers } });
    return { status: response.status, headers: response.headers, body: await response.json() };
  };
}

function multipart({ locations = [JSON.stringify(payload().location)], fields = {}, files = [] } = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ ...payload(), ...fields })) {
    if (key !== 'location') form.append(key, value);
  }
  for (const location of locations) form.append('location', location);
  for (const { name = 'evidence', mimeType = 'image/png', content = 'png' } of files) form.append(name, new Blob([content], { type: mimeType }), 'evidence.png');
  return form;
}

test('report routes reject unauthenticated, malformed-owner, deleted-user and changed-role sessions before data access', async (t) => {
  let reads = 0;
  const communityReports = { async findByReporter() { reads += 1; return []; } };
  const get = await api(t, { communityReports, users: { async findById(id) { if (id === foreign) return null; return { id, role: 'COMMUNITY_MEMBER' }; } } });
  for (const options of [{ id: null }, { id: 'invalid-object-id' }, { id: foreign }]) assert.equal((await get('/my-reports', options)).status, 401);
  assert.equal((await get('/my-reports', { role: 'ADMIN' })).status, 403);
  const changedRole = await api(t, { communityReports, users: { async findById() { return { id: owner, role: 'ADMIN' }; } } });
  assert.equal((await changedRole('/my-reports')).status, 403);
  assert.equal(reads, 0);
  const usersUnavailable = await api(t, { communityReports, users: { async findById() { throw new Error('private connection string'); } } });
  const userLookupError = await usersUnavailable('/my-reports');
  assert.equal(userLookupError.status, 500);
  assert.deepEqual(userLookupError.body, { error: { message: 'Internal server error.' } });
});

test('My Reports endpoint forwards permitted filters and hides repository failures', async (t) => {
  let filter;
  const get = await api(t, { communityReports: { async findByReporter(id, status) { assert.equal(id, owner); filter = status; return []; } } });
  for (const status of ['approved', 'rejected', 'under_review']) {
    const result = await get(`/my-reports?status=${status}`);
    assert.equal(result.status, 200);
    assert.equal(filter, status);
    assert.deepEqual(result.body, { reports: [] });
    assert.equal(result.headers.get('cache-control'), 'no-store');
  }
  const failing = await api(t, { communityReports: { async findByReporter() { throw new Error('private database details'); } } });
  const error = await failing('/my-reports');
  assert.equal(error.status, 500);
  assert.deepEqual(error.body, { error: { message: 'Internal server error.' } });
});

test('Report Details endpoint has owner-scoped no-store success, indistinguishable missing/foreign responses and safe failures', async (t) => {
  let calls = 0;
  const get = await api(t, { communityReports: { async findByIdAndReporter(id, reporterId) { calls += 1; return reporterId === owner && id === foreign ? document() : null; } } });
  const success = await get(`/my-reports/${foreign}`);
  assert.equal(success.status, 200);
  assert.equal(success.headers.get('cache-control'), 'no-store');
  assert.equal(success.body.report._id, foreign);
  assert.equal(success.body.report.reporterId, undefined);
  const missing = await get('/my-reports/111111111111111111111111');
  const someoneElse = await get(`/my-reports/${foreign}`, { id: foreign });
  assert.deepEqual(missing.body, someoneElse.body);
  assert.equal(missing.status, 404);
  assert.equal(someoneElse.status, 404);
  assert.equal((await get('/my-reports/invalid')).status, 400);
  assert.equal(calls, 3, 'invalid ids must be rejected before repository access');
  const failing = await api(t, { communityReports: { async findByIdAndReporter() { throw new Error('private database details'); } } });
  assert.deepEqual(await failing(`/my-reports/${foreign}`).then(({ status, body }) => ({ status, body })), { status: 500, body: { error: { message: 'Internal server error.' } } });
});

test('multipart report location accepts JSON and rejects malformed or repeated location fields', async (t) => {
  let writes = 0;
  const post = await api(t, { communityReports: { async findBySubmission() { return null; }, async create(data) { writes += 1; return document(data); } } });
  const good = await post('', { method: 'POST', body: multipart() });
  assert.equal(good.status, 201);
  assert.deepEqual(good.body.report.location.coordinates, { latitude: 7, longitude: 80 });
  for (const locations of [['not JSON'], ['{}', '{}']]) {
    const bad = await post('', { method: 'POST', body: multipart({ locations }) });
    assert.equal(bad.status, 400);
    assert.deepEqual(bad.body, { error: { message: 'Location must be valid JSON.' } });
  }
  const legacy = multipart({ locations: [], fields: { manualLocation: 'Forest entrance' } });
  assert.equal((await post('', { method: 'POST', body: legacy })).status, 201);
  assert.equal(writes, 2);
});

test('multipart upload rejects unsupported media, unexpected fields, excessive files and oversized video before persistence', async (t) => {
  let lookups = 0;
  const post = await api(t, { communityReports: { async findBySubmission() { lookups += 1; return null; } } });
  const cases = [
    [multipart({ files: [{ mimeType: 'application/pdf' }] }), 400, 'Unsupported evidence file type.'],
    [multipart({ files: [{ name: 'other' }] }), 400, 'Only evidence files are allowed.'],
    [multipart({ files: Array.from({ length: 4 }, () => ({})) }), 413, 'A maximum of 3 evidence files is allowed.'],
    [multipart({ files: [{ mimeType: 'video/mp4', content: Buffer.alloc(EVIDENCE_VIDEO_MAX_BYTES + 1) }] }), 413, 'Video files must not exceed 25 MB.'],
    [multipart({ fields: { description: 'a'.repeat(1024 * 1024 + 1) } }), 400, 'Invalid multipart request.'],
  ];
  for (const [body, status, message] of cases) {
    const result = await post('', { method: 'POST', body });
    assert.equal(result.status, status);
    assert.equal(result.body.error.message, message);
  }
  const malformed = await post('', { method: 'POST', headers: { 'Content-Type': 'multipart/form-data; boundary=unfinished' }, body: '--unfinished\r\nContent-Disposition: form-data; name="description"\r\n\r\nbroken' });
  assert.equal(malformed.status, 400);
  assert.equal(malformed.body.error.message, 'Invalid multipart request.');
  assert.equal(lookups, 0);
});

test('location search endpoint validates allowed query fields, maps matches and handles provider outages', async (t) => {
  let searches = 0;
  const get = await api(t, { geocoding: { async search(query, limit) { searches += 1; assert.deepEqual([query, limit], ['Kandy', 5]); return [{ place_id: 1, display_name: 'Kandy', lat: 7, lon: 80 }]; } } });
  const found = await get('/locations/search?q=%20Kandy%20');
  assert.equal(found.status, 200);
  assert.deepEqual(found.body.results, [{ placeId: '1', displayName: 'Kandy', coordinates: { latitude: 7, longitude: 80 } }]);
  for (const query of ['?q=ab', '?q=Kandy&q=Galle', '?q=Kandy&owner=other', '']) assert.equal((await get('/locations/search' + query)).status, 400);
  assert.equal(searches, 1);
  const unavailable = await api(t, { geocoding: { async search() { throw new GeocodingUnavailableError('private provider URL'); } } });
  assert.deepEqual(await unavailable('/locations/search?q=Kandy').then(({ status, body }) => ({ status, body })), { status: 503, body: { error: { message: 'Location search is temporarily unavailable.' } } });
});

test('reverse endpoint parses decimal coordinates, returns no-match null and rejects unsupported number formats/fields', async (t) => {
  let coordinates;
  const get = await api(t, { geocoding: { async reverse(value) { coordinates = value; return value.latitude === 0 ? null : { lat: value.latitude, lon: value.longitude, display_name: 'Kandy' }; } } });
  assert.equal((await get('/locations/reverse?latitude=%20.5%20&longitude=-80.25')).status, 200);
  assert.deepEqual(coordinates, { latitude: 0.5, longitude: -80.25 });
  assert.deepEqual((await get('/locations/reverse?latitude=0&longitude=0')).body, { location: null });
  for (const query of ['', '?latitude=91&longitude=80', '?latitude=7&longitude=181', '?latitude=1e1&longitude=80', '?latitude=7&longitude=0x50', '?latitude=7&latitude=8&longitude=80', '?latitude=7&longitude=80&private=1']) assert.equal((await get('/locations/reverse' + query)).status, 400);
});
