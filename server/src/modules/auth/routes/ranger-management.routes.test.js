import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import express from 'express';
import { errorHandler } from '../../../middleware/errors.js';
import { createAuthToken } from '../utils/token.js';
import { createAuthRouter } from './auth.routes.js';

const jwtSecret = 'ranger-management-route-test-secret';
const managerId = '507f1f77bcf86cd799439011';
const rangerIds = [
  '507f1f77bcf86cd799439012',
  '507f1f77bcf86cd799439013',
  '507f1f77bcf86cd799439014',
];
const password = 'WildPass9';
const passwordHash = await bcrypt.hash(password, 4);

function createFixture() {
  const manager = { id: managerId, role: 'PARK_MANAGER' };
  const rangers = ['PENDING', 'APPROVED', 'REJECTED'].map((approvalStatus, index) => ({
    id: rangerIds[index],
    _id: rangerIds[index],
    role: 'PARK_RANGER',
    fullName: `Ranger ${index}`,
    rangerId: `RG-${index}`,
    email: `ranger-${index}@example.test`,
    assignedPark: 'Yala National Park',
    approvalStatus,
    createdAt: new Date('2026-10-08T05:00:00.000Z'),
    passwordHash,
    token: 'private-token',
  }));
  let listCalls = 0;
  const users = {
    async findById(id) {
      return id === managerId ? manager : rangers.find((ranger) => ranger.id === id);
    },
    async findByEmail(email) {
      return rangers.find((ranger) => ranger.email === email);
    },
    async findRangers() {
      listCalls += 1;
      return rangers;
    },
    async findPendingRangers() {
      return rangers.filter((ranger) => ranger.approvalStatus === 'PENDING')
        .map(({ _id, fullName, email, rangerId, assignedPark, approvalStatus, createdAt }) => ({
          _id, fullName, email, rangerId, assignedPark, approvalStatus, createdAt,
        }));
    },
    async findRangerById(id) {
      return rangers.find((ranger) => ranger.id === id);
    },
    async updateRangerApprovalStatus(id, approvalStatus) {
      const ranger = rangers.find((record) => record.id === id);
      ranger.approvalStatus = approvalStatus;
      return ranger;
    },
  };
  return { manager, rangers, users, get listCalls() { return listCalls; } };
}

async function startApi(t, fixture = createFixture()) {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', createAuthRouter(fixture.users, {
    jwtSecret, jwtExpiresIn: '1h', nodeEnv: 'test',
  }));
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return { ...fixture, url: `http://127.0.0.1:${server.address().port}/api/auth` };
}

function cookieFor(user) {
  return `wildguard.token=${encodeURIComponent(createAuthToken(user, jwtSecret, '1h'))}`;
}

function getRangers(api, user = api.manager, path = '/rangers') {
  return fetch(`${api.url}${path}`, { headers: { Cookie: cookieFor(user) } });
}

function setApproval(api, ranger, status) {
  return fetch(`${api.url}/rangers/${ranger.id}/approval`, {
    method: 'PATCH',
    headers: { Cookie: cookieFor(api.manager), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

function login(api, ranger) {
  return fetch(`${api.url}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ranger.email, password }),
  });
}

test('manager listing includes all statuses with the safe public response', async (t) => {
  const api = await startApi(t);
  const response = await getRangers(api);
  assert.equal(response.status, 200);
  const { rangers } = await response.json();
  assert.deepEqual(rangers.map((ranger) => ranger.approvalStatus), [
    'PENDING', 'APPROVED', 'REJECTED',
  ]);
  assert.equal(rangers[0]._id, rangerIds[0]);
  assert.equal(rangers[0].createdAt, '2026-10-08T05:00:00.000Z');
  for (const ranger of rangers) {
    assert.deepEqual(Object.keys(ranger).sort(), [
      '_id', 'approvalStatus', 'assignedPark', 'createdAt', 'email', 'fullName', 'rangerId',
    ]);
  }
});

test('listing requires a valid cookie and a current database manager account', async (t) => {
  const fixture = createFixture();
  const api = await startApi(t, fixture);
  assert.equal((await fetch(`${api.url}/rangers`)).status, 401);
  assert.equal((await fetch(`${api.url}/rangers`, {
    headers: { Cookie: 'wildguard.token=invalid-token' },
  })).status, 401);
  assert.equal((await getRangers(api, {
    id: '507f1f77bcf86cd799439099', role: 'PARK_MANAGER',
  })).status, 401);
  assert.equal((await getRangers(api, { id: 'invalid-id', role: 'PARK_MANAGER' })).status, 401);
  assert.equal(fixture.listCalls, 0);
});

test('Rangers, community members, and stale manager roles cannot list Rangers', async (t) => {
  const fixture = createFixture();
  const api = await startApi(t, fixture);
  const rangerResponse = await getRangers(api, api.rangers[1]);
  assert.equal(rangerResponse.status, 403);
  assert.deepEqual(await rangerResponse.json(), {
    error: { message: 'Only Park Managers can access this resource.' },
  });
  assert.equal((await getRangers(api, { id: managerId, role: 'COMMUNITY_MEMBER' })).status, 403);
  fixture.manager.role = 'PARK_RANGER';
  assert.equal((await getRangers(api, { id: managerId, role: 'PARK_MANAGER' })).status, 403);
  assert.equal(fixture.listCalls, 0);
});

test('legacy pending endpoint still returns only pending registrations and requires a manager', async (t) => {
  const api = await startApi(t);
  const response = await getRangers(api, api.manager, '/rangers/pending');
  assert.equal(response.status, 200);
  const { rangers } = await response.json();
  assert.equal(rangers.length, 1);
  assert.equal(rangers[0].approvalStatus, 'PENDING');
  assert.equal((await getRangers(api, api.rangers[1], '/rangers/pending')).status, 403);
  assert.equal((await fetch(`${api.url}/rangers/pending`)).status, 401);
});

test('approval updates later listings and permits login without allowing another decision', async (t) => {
  const api = await startApi(t);
  const ranger = api.rangers[0];
  const pendingLogin = await login(api, ranger);
  assert.equal(pendingLogin.status, 403);
  assert.match((await pendingLogin.json()).error.message, /waiting for Park Manager approval/);

  const response = await setApproval(api, ranger, 'APPROVED');
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.ranger.id, ranger.id);
  assert.equal(payload.ranger.approvalStatus, 'APPROVED');
  assert.equal(payload.message, 'Ranger account approved successfully.');
  assert.equal('passwordHash' in payload.ranger, false);

  const refreshed = await (await getRangers(api)).json();
  assert.equal(refreshed.rangers.find((record) => record._id === ranger.id).approvalStatus, 'APPROVED');
  assert.equal((await (await getRangers(api, api.manager, '/rangers/pending')).json()).rangers.length, 0);
  assert.equal((await setApproval(api, ranger, 'REJECTED')).status, 409);
  const approvedLogin = await login(api, ranger);
  assert.equal(approvedLogin.status, 200);
  assert.match(approvedLogin.headers.get('set-cookie'), /wildguard\.token=/);
});

test('rejection updates later listings and keeps rejected registration login blocked', async (t) => {
  const api = await startApi(t);
  const ranger = api.rangers[0];
  const response = await setApproval(api, ranger, 'REJECTED');
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.ranger.approvalStatus, 'REJECTED');
  assert.equal(payload.message, 'Ranger account rejected.');
  const refreshed = await (await getRangers(api)).json();
  assert.equal(refreshed.rangers.find((record) => record._id === ranger.id).approvalStatus, 'REJECTED');
  assert.equal((await setApproval(api, ranger, 'APPROVED')).status, 409);
  const rejectedLogin = await login(api, ranger);
  assert.equal(rejectedLogin.status, 403);
  assert.match((await rejectedLogin.json()).error.message, /registration has been rejected/);
});
