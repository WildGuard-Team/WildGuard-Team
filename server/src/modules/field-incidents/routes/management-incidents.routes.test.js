import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createFieldIncidentRouter } from './field-incident.routes.js';
import { createAuthToken } from '../../auth/utils/token.js';
import { errorHandler } from '../../../middleware/errors.js';

const JWT_SECRET = 'management-incidents-test-secret';
const MANAGER_ID = '507f1f77bcf86cd799439011';

function createIncident(overrides = {}) {
  return {
    _id: '507f1f77bcf86cd799439012', referenceNumber: 'FI-20261015-001',
    rangerIdSnapshot: 'DWC-127',
    ranger: { _id: '507f1f77bcf86cd799439013', fullName: 'Kamal Ranger', rangerId: 'DWC-127', email: 'private@example.com', passwordHash: 'private' },
    incidentType: 'POACHING', incidentDateTime: new Date('2026-10-15T10:00:00Z'),
    riskLevel: 'HIGH', parkZone: 'Yala National Park', blockArea: 'Block I',
    location: { source: 'GPS', point: { type: 'Point', coordinates: [81.52, 6.38] }, description: 'Near the waterhole' },
    description: 'A snare was found on the patrol route.', additionalNotes: 'Area secured.',
    evidence: [{ secureUrl: 'https://example.com/evidence.jpg', resourceType: 'image', originalName: 'evidence.jpg', mimeType: 'image/jpeg', bytes: 200, publicId: 'private-cloudinary-id' }],
    status: 'SUBMITTED', createdAt: new Date('2026-10-15T10:30:00Z'),
    assignedParkSnapshot: 'Yala National Park', rangerUserId: 'private-user-id',
    ...overrides,
  };
}

async function startServer({ role = 'PARK_MANAGER', tokenRole = role, assignedPark = 'Yala National Park', missingUser = false, incidents = [createIncident()] } = {}) {
  const user = { id: MANAGER_ID, role, assignedPark, approvalStatus: 'APPROVED' };
  const calls = [];
  const fieldIncidents = { async listForManagement(manager, query) {
    calls.push({ manager, query });
    return { incidents, total: incidents.length, statistics: { total: 30, low: 10, medium: 12, high: 8 }, parks: ['Yala National Park'] };
  } };
  const users = { async findById() { return missingUser ? null : user; } };
  const app = express();
  app.use('/api/field-incidents', createFieldIncidentRouter(fieldIncidents, users, { jwtSecret: JWT_SECRET, nodeEnv: 'test' }));
  app.use(errorHandler);
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  return {
    calls,
    async get(query = '', { authenticated = true, userId = MANAGER_ID } = {}) {
      const token = createAuthToken({ id: userId, role: tokenRole }, JWT_SECRET, '1h');
      return fetch(`http://127.0.0.1:${server.address().port}/api/field-incidents/management${query}`, {
        headers: authenticated ? { Cookie: `wildguard.token=${encodeURIComponent(token)}` } : {},
      });
    },
    async close() { await new Promise((resolve) => server.close(resolve)); },
  };
}

test('authorized manager retrieves safe complete report details, saved coordinates, ranger identity and statistics', async () => {
  const server = await startServer();
  try {
    const response = await server.get('?page=1&pageSize=10&riskLevel=HIGH');
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.incidents[0].id, '507f1f77bcf86cd799439012');
    assert.deepEqual(body.incidents[0].ranger, { id: '507f1f77bcf86cd799439013', fullName: 'Kamal Ranger', rangerId: 'DWC-127' });
    assert.deepEqual(body.incidents[0].location.coordinates, { latitude: 6.38, longitude: 81.52 });
    assert.equal(body.incidents[0].evidence[0].publicId, undefined);
    assert.equal(body.incidents[0].assignedParkSnapshot, undefined);
    assert.equal(body.incidents[0].rangerUserId, undefined);
    assert.equal(body.incidents[0].description, 'A snare was found on the patrol route.');
    assert.deepEqual(body.statistics, { total: 30, low: 10, medium: 12, high: 8 });
    assert.deepEqual(body.pagination, { page: 1, pageSize: 10, total: 1, totalPages: 1 });
    assert.deepEqual(body.filters, { parks: ['Yala National Park'] });
    assert.equal(server.calls[0].query.riskLevel, 'HIGH');
  } finally { await server.close(); }
});

for (const options of [
  { role: 'PARK_RANGER' }, { role: 'COMMUNITY_MEMBER' },
  { role: 'PARK_RANGER', tokenRole: 'PARK_MANAGER' },
  { role: 'PARK_MANAGER', tokenRole: 'PARK_RANGER' },
  { assignedPark: { $ne: '' } },
]) {
  test(`denies manager incident access before repository use: ${JSON.stringify(options)}`, async () => {
    const server = await startServer(options);
    try {
      const response = await server.get('?assignedPark=Yala%20National%20Park&parkZone=Yala%20National%20Park');
      assert.equal(response.status, 403);
      assert.deepEqual(server.calls, []);
    } finally { await server.close(); }
  });
}

for (const options of [{ authenticated: false }, { userId: 'bad-id' }]) {
  test(`rejects unauthenticated or invalid token identity ${JSON.stringify(options)}`, async () => {
    const server = await startServer();
    try {
      const response = await server.get('', options);
      assert.equal(response.status, 401);
      assert.deepEqual(server.calls, []);
    } finally { await server.close(); }
  });
}

test('deleted manager account is denied', async () => {
  const server = await startServer({ missingUser: true });
  try {
    assert.equal((await server.get()).status, 401);
    assert.deepEqual(server.calls, []);
  } finally { await server.close(); }
});

test('manager without assigned park can retrieve authorized reports and statistics across parks', async () => {
  const server = await startServer({ assignedPark: '', incidents: [
    createIncident(),
    createIncident({ _id: 'wilpattu-report', assignedParkSnapshot: 'Wilpattu National Park', parkZone: 'Wilpattu National Park' }),
  ] });
  try {
    const response = await server.get();
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.incidents.length, 2);
    assert.equal(body.pagination.total, 2);
    assert.equal(server.calls[0].manager.assignedPark, '');
  } finally { await server.close(); }
});

test('query scope cannot be overridden by client parameters', async () => {
  const server = await startServer();
  try {
    assert.equal((await server.get('?assignedPark=Wilpattu&managerId=other&parkZone=Wilpattu')).status, 200);
    assert.equal(server.calls[0].manager.assignedPark, 'Yala National Park');
    assert.equal(server.calls[0].query.parkZone, 'Wilpattu');
    assert.equal(server.calls[0].query.assignedPark, undefined);
  } finally { await server.close(); }
});

test('invalid filters return 400 without querying incident storage', async () => {
  const server = await startServer();
  try {
    assert.equal((await server.get('?startDate=2026-02-30&pageSize=1000')).status, 400);
    assert.deepEqual(server.calls, []);
  } finally { await server.close(); }
});

test('legacy records support deleted rangers, missing location and invalid GPS', async () => {
  const server = await startServer({ incidents: [
    createIncident({ ranger: undefined, location: undefined }),
    createIncident({ _id: 'invalid-gps', location: { source: 'GPS', point: { coordinates: [181, 91] } } }),
  ] });
  try {
    const response = await server.get();
    const { incidents } = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(incidents[0].ranger, { id: null, fullName: 'DWC-127', rangerId: 'DWC-127' });
    assert.equal(incidents[0].location.coordinates, null);
    assert.equal(incidents[1].location.coordinates, null);
  } finally { await server.close(); }
});

test('empty scoped incident list preserves pagination metadata', async () => {
  const server = await startServer({ incidents: [] });
  try {
    const response = await server.get();
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(body.incidents, []);
    assert.deepEqual(body.pagination, { page: 1, pageSize: 25, total: 0, totalPages: 1 });
  } finally { await server.close(); }
});
