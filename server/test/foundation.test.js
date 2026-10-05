import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { readConfig } from '../src/config/env.js';

const validEnv = {
  PORT: '5000', MONGODB_URI: 'mongodb://127.0.0.1:27017/wildguard',
  CLIENT_ORIGIN: 'http://127.0.0.1:5173',
};

test('startup validates missing and malformed configuration', () => {
  assert.equal(readConfig(validEnv).port, 5000);
  for (const key of Object.keys(validEnv)) {
    assert.throws(() => readConfig({ ...validEnv, [key]: '' }), new RegExp(key));
  }
  for (const port of ['0', '65536', 'abc', '1.5']) {
    assert.throws(() => readConfig({ ...validEnv, PORT: port }), /PORT/);
  }
  assert.throws(() => readConfig({ ...validEnv, MONGODB_URI: 'mongodb://localhost:27017/' }), /MONGODB_URI/);
  assert.throws(() => readConfig({ ...validEnv, CLIENT_ORIGIN: 'http://localhost:5173/path' }), /CLIENT_ORIGIN/);
});

test('HTTP health, CORS, missing routes, and malformed JSON contracts', async (t) => {
  let connected = true;
  const app = createApp({ clientOrigin: validEnv.CLIENT_ORIGIN, isDatabaseConnected: () => connected });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const health = await fetch(`${base}/api/health`, { headers: { Origin: validEnv.CLIENT_ORIGIN } });
  assert.equal(health.status, 200);
  assert.equal(health.headers.get('access-control-allow-origin'), validEnv.CLIENT_ORIGIN);
  assert.equal((await health.json()).database, 'connected');
  connected = false;
  const unavailable = await fetch(`${base}/api/health`);
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.json()).status, 'unavailable');
  const missing = await fetch(`${base}/api/missing`);
  assert.equal(missing.status, 404);
  assert.match((await missing.json()).error.message, /Route not found/);
  const invalid = await fetch(`${base}/api/health`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
  });
  assert.equal(invalid.status, 400);
  assert.deepEqual(await invalid.json(), { error: { message: 'Invalid JSON body.' } });
});
