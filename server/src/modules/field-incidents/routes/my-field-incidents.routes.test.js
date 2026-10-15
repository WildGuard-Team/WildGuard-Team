import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

import { createFieldIncidentRouter } from './field-incident.routes.js';
import { createFieldIncidentRepository } from '../repositories/field-incident.repository.js';
import { createAuthToken } from '../../auth/utils/token.js';
import { errorHandler } from '../../../middleware/errors.js';

const JWT_SECRET = 'my-field-incidents-test-secret';
const RANGER_ID = '507f1f77bcf86cd799439011';
const OTHER_RANGER_ID = '507f1f77bcf86cd799439012';

function createIncident(id, rangerUserId, createdAt) {
  return {
    id,
    referenceNumber: `FI-20261008-${id.toUpperCase()}`,
    clientIncidentId: `client-${id}`,
    rangerUserId,
    rangerIdSnapshot: 'DWC-RG-00127',
    assignedParkSnapshot: 'Yala National Park',
    incidentType: 'POACHING',
    incidentDateTime: new Date('2026-10-08T10:30:00.000Z'),
    riskLevel: 'HIGH',
    parkZone: 'Yala National Park',
    blockArea: 'Block 1',
    location: {
      source: 'GPS',
      point: { type: 'Point', coordinates: [79.844487, 6.933144] },
      description: 'Near the eastern patrol trail',
    },
    description: 'Wire snare found during patrol.',
    additionalNotes: 'Area secured.',
    evidence: [{
      secureUrl: 'https://res.cloudinary.com/wildguard/image/upload/evidence.jpg',
      publicId: 'private/cloudinary-id',
      resourceType: 'image',
      originalName: 'evidence.jpg',
      mimeType: 'image/jpeg',
      bytes: 200,
      width: 100,
      height: 80,
    }],
    status: 'SUBMITTED',
    createdAt: new Date(createdAt),
    passwordHash: 'must-never-be-returned',
    authToken: 'must-never-be-returned',
    __v: 1,
  };
}

async function startServer({ role = 'PARK_RANGER', approvalStatus = 'APPROVED', incidents } = {}) {
  const ranger = { id: RANGER_ID, role, approvalStatus };
  const storedIncidents = incidents ?? [
    createIncident('older', RANGER_ID, '2026-10-08T10:31:00.000Z'),
    createIncident('other', OTHER_RANGER_ID, '2026-10-08T12:31:00.000Z'),
    createIncident('newer', RANGER_ID, '2026-10-08T11:31:00.000Z'),
  ];
  const calls = { find: [], sort: [] };
  const fieldIncidents = createFieldIncidentRepository({
    find(filter) {
      calls.find.push(filter);
      return {
        async sort(order) {
          calls.sort.push(order);
          return storedIncidents
            .filter((incident) => incident.rangerUserId === filter.rangerUserId)
            .sort((left, right) => order.createdAt * (left.createdAt - right.createdAt));
        },
      };
    },
  });
  const users = {
    async findById(id) {
      return id === RANGER_ID ? ranger : null;
    },
  };
  const app = express();
  app.use(express.json());
  app.use('/api/field-incidents', createFieldIncidentRouter(fieldIncidents, users, {
    jwtSecret: JWT_SECRET,
    cloudinary: null,
    nodeEnv: 'test',
  }));
  app.use(errorHandler);
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const url = `http://127.0.0.1:${server.address().port}`;
  return {
    calls,
    async get(path = '/api/field-incidents/mine', authenticated = true) {
      const token = createAuthToken(ranger, JWT_SECRET, '1h');
      return fetch(`${url}${path}`, {
        headers: authenticated ? { Cookie: `wildguard.token=${encodeURIComponent(token)}` } : {},
      });
    },
    async close() {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    },
  };
}

test('approved Ranger retrieves their own submitted incidents', async () => {
  const server = await startServer();
  try {
    const response = await server.get();
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(body.incidents.map((incident) => incident.id), ['newer', 'older']);
    assert.ok(body.incidents.every((incident) => incident.status === 'SUBMITTED'));
  } finally {
    await server.close();
  }
});

test('Ranger cannot use query parameters to retrieve another Ranger incidents', async () => {
  const server = await startServer();
  try {
    const response = await server.get(`/api/field-incidents/mine?rangerUserId=${OTHER_RANGER_ID}&userId=${OTHER_RANGER_ID}`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(server.calls.find, [{ rangerUserId: RANGER_ID }]);
    assert.ok(!body.incidents.some((incident) => incident.id === 'other'));
  } finally {
    await server.close();
  }
});

for (const role of ['COMMUNITY_MEMBER', 'PARK_MANAGER']) {
  test(`${role} cannot access Ranger personal incident history`, async () => {
    const server = await startServer({ role });
    try {
      const response = await server.get();
      assert.equal(response.status, 403);
      assert.deepEqual(server.calls.find, []);
    } finally {
      await server.close();
    }
  });
}

test('unauthenticated request cannot access Ranger incident history', async () => {
  const server = await startServer();
  try {
    const response = await server.get('/api/field-incidents/mine', false);
    assert.equal(response.status, 401);
    assert.deepEqual(server.calls.find, []);
  } finally {
    await server.close();
  }
});

test('incident history uses public mapping and omits private user and Cloudinary fields', async () => {
  const server = await startServer();
  try {
    const response = await server.get();
    const { incidents } = await response.json();
    const incident = incidents[0];
    assert.deepEqual(Object.keys(incident).sort(), [
      'id', 'referenceNumber', 'clientIncidentId', 'incidentType', 'incidentDateTime',
      'riskLevel', 'parkZone', 'blockArea', 'location', 'description',
      'additionalNotes', 'evidence', 'status', 'createdAt',
    ].sort());
    assert.deepEqual(incident.location.coordinates, { latitude: 6.933144, longitude: 79.844487 });
    assert.equal(incident.incidentDateTime, '2026-10-08T10:30:00.000Z');
    assert.equal(incident.evidence[0].secureUrl, 'https://res.cloudinary.com/wildguard/image/upload/evidence.jpg');
    assert.equal(incident.evidence[0].publicId, undefined);
    assert.equal(incident.passwordHash, undefined);
    assert.equal(incident.authToken, undefined);
    assert.equal(incident.rangerUserId, undefined);
  } finally {
    await server.close();
  }
});

test('history uses the authenticated Ranger repository filter and newest-first ordering', async () => {
  const server = await startServer();
  try {
    const response = await server.get();
    const { incidents } = await response.json();
    assert.deepEqual(server.calls.find, [{ rangerUserId: RANGER_ID }]);
    assert.deepEqual(server.calls.sort, [{ createdAt: -1 }]);
    assert.ok(new Date(incidents[0].createdAt) > new Date(incidents[1].createdAt));
  } finally {
    await server.close();
  }
});

for (const approvalStatus of ['PENDING', 'REJECTED']) {
  test(`${approvalStatus} Ranger cannot access incident history`, async () => {
    const server = await startServer({ approvalStatus });
    try {
      const response = await server.get();
      assert.equal(response.status, 403);
      assert.deepEqual(server.calls.find, []);
    } finally {
      await server.close();
    }
  });
}

test('Ranger with no submitted incidents receives an empty list', async () => {
  const server = await startServer({ incidents: [] });
  try {
    const response = await server.get();
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { incidents: [] });
  } finally {
    await server.close();
  }
});
