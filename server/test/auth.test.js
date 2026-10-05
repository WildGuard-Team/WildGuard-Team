import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { User } from '../src/modules/auth/models/user.model.js';

const clientOrigin = 'http://localhost:3000';
const testUri = 'mongodb://127.0.0.1:27017/wildguard_auth_test';
const testPrefix = 'wildguard-auth-test-';

function testEmail(label) {
  return `${testPrefix}${label}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
}

async function startApi(t, users) {
  const app = createApp({
    clientOrigin, isDatabaseConnected: () => true, users,
    jwtSecret: 'a-test-secret-that-is-longer-than-thirty-two-characters', jwtExpiresIn: '24h',
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

function jsonRequest(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Origin: clientOrigin, ...options.headers },
  });
}

test.before(async () => {
  try {
    await mongoose.connect(testUri, { serverSelectionTimeoutMS: 5000 });
    await User.init();
  } catch (error) {
    throw new Error(`Auth integration tests require local MongoDB at ${testUri}: ${error.message}`);
  }
});

test.after(async () => {
  await User.deleteMany({ email: new RegExp(`^${testPrefix}`) });
  await mongoose.disconnect();
});

test('registration normalizes email, hashes the password, and never returns it', async (t) => {
  const base = await startApi(t);
  const email = testEmail('register').toUpperCase();
  const response = await jsonRequest(`${base}/api/auth/register`, {
    method: 'POST', body: JSON.stringify({ fullName: '  Mara   Silva ', email, password: 'WildPass9' }),
  });
  assert.equal(response.status, 201);
  const payload = await response.json();
  assert.deepEqual(Object.keys(payload.user).sort(), ['createdAt', 'email', 'fullName', 'id', 'role']);
  assert.equal(payload.user.email, email.toLowerCase());
  assert.equal(payload.user.fullName, 'Mara Silva');
  assert.equal(payload.user.role, 'COMMUNITY_MEMBER');
  assert.equal(response.headers.get('set-cookie'), null);
  const stored = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  assert.ok(stored.passwordHash.startsWith('$2'));
  assert.notEqual(stored.passwordHash, 'WildPass9');
});

test('registration rejects duplicate email by database uniqueness and client-supplied role', async (t) => {
  const base = await startApi(t);
  const email = testEmail('duplicate');
  const input = { fullName: 'Nimal Perera', email, password: 'WildPass9' };
  assert.equal((await jsonRequest(`${base}/api/auth/register`, { method: 'POST', body: JSON.stringify(input) })).status, 201);
  const duplicate = await jsonRequest(`${base}/api/auth/register`, { method: 'POST', body: JSON.stringify(input) });
  assert.equal(duplicate.status, 409);
  assert.deepEqual(await duplicate.json(), { error: { message: 'An account with this email already exists.' } });
  const privileged = await jsonRequest(`${base}/api/auth/register`, {
    method: 'POST', body: JSON.stringify({ ...input, email: testEmail('role'), role: 'ADMIN' }),
  });
  assert.equal(privileged.status, 400);
  assert.match((await privileged.json()).error.message, /Role cannot/);
});

test('registration validates required fields and rejects an untrusted origin', async (t) => {
  const base = await startApi(t);
  const invalid = await jsonRequest(`${base}/api/auth/register`, {
    method: 'POST', body: JSON.stringify({ fullName: '', email: 'not-email', password: 'short' }),
  });
  assert.equal(invalid.status, 400);
  const origin = await fetch(`${base}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.example' }, body: '{}',
  });
  assert.equal(origin.status, 403);
  assert.deepEqual(await origin.json(), { error: { message: 'Request origin is not allowed.' } });
});

test('login sets a JWT cookie that authorizes me and logout clears it', async (t) => {
  const base = await startApi(t);
  const email = testEmail('token');
  const registration = { fullName: 'Asha Fernando', email, password: 'WildPass9' };
  await jsonRequest(`${base}/api/auth/register`, { method: 'POST', body: JSON.stringify(registration) });
  const login = await jsonRequest(`${base}/api/auth/login`, {
    method: 'POST', body: JSON.stringify({ email: email.toUpperCase(), password: registration.password }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie');
  assert.match(cookie, /wildguard\.token=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  const me = await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookie.split(';')[0] } });
  assert.equal(me.status, 200);
  assert.equal((await me.json()).user.email, email);
  const logout = await jsonRequest(`${base}/api/auth/logout`, {
    method: 'POST', headers: { Cookie: cookie.split(';')[0] },
  });
  assert.equal(logout.status, 200);
  assert.deepEqual(await logout.json(), { message: 'Logged out.' });
  const afterLogout = await fetch(`${base}/api/auth/me`);
  assert.equal(afterLogout.status, 401);
});

test('login uses a safe shared response for wrong and unknown credentials', async (t) => {
  const base = await startApi(t);
  const email = testEmail('credentials');
  await jsonRequest(`${base}/api/auth/register`, {
    method: 'POST', body: JSON.stringify({ fullName: 'Kamal Dias', email, password: 'WildPass9' }),
  });
  const wrong = await jsonRequest(`${base}/api/auth/login`, {
    method: 'POST', body: JSON.stringify({ email, password: 'WrongPass9' }),
  });
  const unknown = await jsonRequest(`${base}/api/auth/login`, {
    method: 'POST', body: JSON.stringify({ email: testEmail('unknown'), password: 'WrongPass9' }),
  });
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.deepEqual(await wrong.json(), await unknown.json());
});

test('me requires a JWT cookie and database errors remain safe', async (t) => {
  const base = await startApi(t);
  assert.equal((await fetch(`${base}/api/auth/me`)).status, 401);
  const failingBase = await startApi(t, { create: async () => { throw new Error('database unreachable'); } });
  const failure = await jsonRequest(`${failingBase}/api/auth/register`, {
    method: 'POST', body: JSON.stringify({ fullName: 'Dina Jay', email: testEmail('failure'), password: 'WildPass9' }),
  });
  assert.equal(failure.status, 500);
  assert.deepEqual(await failure.json(), { error: { message: 'Internal server error.' } });
});
