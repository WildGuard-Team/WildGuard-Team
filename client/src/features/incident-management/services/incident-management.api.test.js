import assert from 'node:assert/strict';
import test from 'node:test';
import { getManagedIncidentReports } from './incident-management.api.js';

function createResponse() {
  return {
    incidents: [{
      id: 'incident-1', referenceNumber: 'FI-2026-001',
      ranger: { id: 'ranger-1', fullName: 'Jane Ranger', rangerId: 'R-001' },
      location: { coordinates: { latitude: 6.3812346, longitude: 81.5234568 } },
      evidence: [{ url: '/evidence/incident-1.jpg', fileName: 'incident.jpg', mimeType: 'image/jpeg' }],
    }],
    statistics: { total: 27, low: 17, medium: 9, high: 1 },
    pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    filters: { parks: ['Yala National Park'] },
  };
}

test('manager list uses authenticated existing API and preserves complete saved records and scope statistics', async (t) => {
  const payload = createResponse();
  const controller = new AbortController();
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/field-incidents/management?riskLevel=HIGH&page=1&pageSize=25&sort=newest');
    assert.equal(options.credentials, 'include');
    assert.equal(options.method, 'GET');
    assert.equal(options.signal, controller.signal);
    return { ok: true, status: 200, json: async () => payload };
  });
  const result = await getManagedIncidentReports('riskLevel=HIGH&page=1&pageSize=25&sort=newest', { signal: controller.signal });
  assert.deepEqual(result, payload);
  assert.equal(result.incidents[0].location.coordinates.longitude, 81.5234568);
  assert.equal(result.statistics.total, 27, 'summary totals are supplied by the API, rather than inferred from filtered rows');
});

test('each refresh fetches current database records without reusing a cached list', async (t) => {
  let fetches = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    fetches += 1;
    const payload = createResponse();
    payload.incidents[0].id = `incident-${fetches}`;
    return { ok: true, status: 200, json: async () => payload };
  });
  assert.equal((await getManagedIncidentReports('page=1')).incidents[0].id, 'incident-1');
  assert.equal((await getManagedIncidentReports('page=1')).incidents[0].id, 'incident-2');
});

test('empty authorized scopes remain successful empty results, including zero pages', async (t) => {
  const payload = {
    incidents: [], statistics: { total: 0, low: 0, medium: 0, high: 0 },
    pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 }, filters: { parks: [] },
  };
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, status: 200, json: async () => payload }));
  assert.deepEqual(await getManagedIncidentReports('page=1'), payload);
});

test('expired sessions, park restrictions and outages present actionable API errors', async (t) => {
  for (const [status, message, expected] of [
    [401, 'Internal session details', /session has expired/],
    [403, 'Your account has no assigned park. Please contact your administrator.', /no assigned park/],
    [400, 'Invalid date range.', /Invalid date range/],
    [500, 'Private database details', /temporarily unavailable/],
  ]) {
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => ({
      ok: false, status, json: async () => ({ error: { message } }),
    }));
    await assert.rejects(getManagedIncidentReports('page=1'), expected);
    fetchMock.mock.restore();
  }
});

test('invalid JSON and malformed successful responses do not become zero statistics or demonstration records', async (t) => {
  for (const payload of [null, {}, { ...createResponse(), statistics: { total: -1 } }, { ...createResponse(), incidents: null }]) {
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => ({ ok: true, status: 200, json: async () => payload }));
    await assert.rejects(getManagedIncidentReports('page=1'), /could not be loaded/);
    fetchMock.mock.restore();
  }
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError(); } }));
  await assert.rejects(getManagedIncidentReports('page=1'), /could not be loaded/);
});

test('network failures have a friendly retry message and cancellation remains distinguishable', async (t) => {
  const networkMock = t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(getManagedIncidentReports('page=1'), /Check your connection/);
  networkMock.mock.restore();
  const controller = new AbortController();
  controller.abort();
  const abort = new DOMException('Aborted', 'AbortError');
  t.mock.method(globalThis, 'fetch', async () => { throw abort; });
  await assert.rejects(getManagedIncidentReports('page=1', { signal: controller.signal }), (error) => error === abort);
});
