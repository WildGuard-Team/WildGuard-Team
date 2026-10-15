import assert from 'node:assert/strict';
import test from 'node:test';
import { createGeocodingProvider, GeocodingUnavailableError } from '../src/modules/community-reports/integrations/geocoding.provider.js';
import { searchLocations } from '../src/modules/community-reports/services/location-search.service.js';
import { reverseGeocodeLocation } from '../src/modules/community-reports/services/reverse-geocoding.service.js';
import { GEOCODING_CACHE_TTL_MS } from '../src/modules/community-reports/config/geocoding.config.js';

const options = (fetchImplementation, overrides = {}) => ({ baseUrl: 'https://geocoding.example.test', userAgent: 'WildGuard test contact@example.test', timeoutMs: 100, fetchImplementation, ...overrides });
const response = (payload, status = 200, headers = {}) => ({ ok: status >= 200 && status < 300, status, headers: new Headers(headers), async json() { return payload; }, async text() { return typeof payload === 'string' ? payload : JSON.stringify(payload); } });
const result = (overrides = {}) => ({ place_id: 123, display_name: 'Kandy, Sri Lanka', lat: '7.2906', lon: '80.6337', ...overrides });

test('geocoding requires fetch and builds provider query/header contracts for search and reverse', async (t) => {
  assert.throws(() => createGeocodingProvider(options(null)), { message: 'A fetch implementation is required for geocoding.' });
  let now = 0;
  t.mock.method(Date, 'now', () => { now += 1001; return now; });
  const calls = [];
  const provider = createGeocodingProvider(options(async (url, init) => { calls.push({ url, init }); return response([result()]); }));
  await provider.search('Kandy & forest', 5);
  await provider.reverse({ latitude: 7.2, longitude: 80.6 });
  assert.equal(calls[0].url.pathname, '/search');
  assert.equal(calls[0].url.searchParams.get('q'), 'Kandy & forest');
  assert.equal(calls[0].url.searchParams.get('countrycodes'), 'lk');
  assert.equal(calls[0].url.searchParams.get('limit'), '5');
  assert.equal(calls[1].url.pathname, '/reverse');
  assert.equal(calls[1].url.searchParams.get('lat'), '7.2');
  assert.equal(calls[1].url.searchParams.get('lon'), '80.6');
  assert.deepEqual(calls[0].init.headers, { Accept: 'application/json', 'User-Agent': 'WildGuard test contact@example.test' });
  assert.ok(calls[0].init.signal instanceof AbortSignal);
});

test('provider caches equivalent queries until TTL expiry and keeps reverse coordinates distinct', async (t) => {
  let now = 1000000, calls = 0;
  t.mock.method(Date, 'now', () => now);
  const provider = createGeocodingProvider(options(async () => { calls += 1; return response({ generation: calls }); }));
  assert.deepEqual(await provider.search('Kandy', 5), { generation: 1 });
  assert.deepEqual(await provider.search('KANDY', 5), { generation: 1 });
  assert.equal(calls, 1);
  now += GEOCODING_CACHE_TTL_MS + 1;
  assert.deepEqual(await provider.search('kandy', 5), { generation: 2 });
  now += 1001;
  assert.deepEqual(await provider.reverse({ latitude: 7, longitude: 80 }), { generation: 3 });
  assert.deepEqual(await provider.reverse({ latitude: 7, longitude: 80 }), { generation: 3 });
  assert.equal(calls, 3);
});

test('provider bounds cache to 50 entries and evicts the oldest rather than newer results', async (t) => {
  let now = 1000000, calls = 0;
  t.mock.method(Date, 'now', () => { now += 1001; return now; });
  const provider = createGeocodingProvider(options(async () => { calls += 1; return response({ generation: calls }); }));
  for (let index = 0; index < 51; index += 1) await provider.search(`place-${index}`, 5);
  assert.deepEqual(await provider.search('place-50', 5), { generation: 51 });
  assert.equal(calls, 51);
  assert.deepEqual(await provider.search('place-0', 5), { generation: 52 });
});

test('provider serializes concurrent requests to respect the upstream one-second interval', async () => {
  const requestedAt = [];
  const provider = createGeocodingProvider(options(async () => { requestedAt.push(Date.now()); return response([]); }));
  await Promise.all([provider.search('Kandy', 5), provider.search('Galle', 5)]);
  assert.equal(requestedAt.length, 2);
  assert.ok(requestedAt[1] - requestedAt[0] >= 900, 'distinct provider requests must not bypass the rate limit');
});

test('provider classifies upstream forbidden, rate-limit, server and other failures with bounded diagnostics', async () => {
  for (const [status, kind] of [[403, 'provider-forbidden'], [429, 'provider-rate-limit'], [503, 'provider-server'], [400, 'provider-response']]) {
    const provider = createGeocodingProvider(options(async () => response(`  private\n${'x'.repeat(400)} `, status, { 'retry-after': '0' })));
    await assert.rejects(provider.search('Kandy', 5), (error) => {
      assert.ok(error instanceof GeocodingUnavailableError);
      assert.equal(error.status, status);
      assert.equal(error.kind, kind);
      assert.equal(error.body.length, 240);
      assert.ok(!error.body.includes('\n'));
      return true;
    });
  }
});

test('rate-limit retry-after accepts seconds, dates and invalid/missing values; unreadable error bodies are safe', async () => {
  for (const retryAfter of ['2', new Date(Date.now() + 5000).toUTCString(), 'invalid', '-1', '']) {
    const provider = createGeocodingProvider(options(async () => ({ ...response('', 429, { 'retry-after': retryAfter }), async text() { throw new Error('body unavailable'); } })));
    await assert.rejects(provider.reverse({ latitude: 7, longitude: 80 }), (error) => error.kind === 'provider-rate-limit' && error.body === null);
  }
});

test('network and malformed JSON failures are wrapped with causes and are never cached', async (t) => {
  let now = 1000000, calls = 0;
  t.mock.method(Date, 'now', () => { now += 1001; return now; });
  const provider = createGeocodingProvider(options(async () => { calls += 1; if (calls === 1) throw new TypeError('connection refused'); return response([]); }));
  await assert.rejects(provider.search('Kandy', 5), { name: 'GeocodingUnavailableError', kind: 'network', causeName: 'TypeError', causeMessage: 'connection refused' });
  assert.deepEqual(await provider.search('Kandy', 5), []);
  assert.equal(calls, 2);
  const malformed = createGeocodingProvider(options(async () => ({ ...response(null), async json() { throw new SyntaxError('invalid JSON'); } })));
  await assert.rejects(malformed.search('Kandy', 5), { kind: 'network', causeName: 'SyntaxError' });
});

test('provider timeout aborts upstream fetch and emits diagnostics only in development', async (t) => {
  const warnings = [];
  t.mock.method(console, 'warn', (...args) => warnings.push(args));
  const provider = createGeocodingProvider(options(async (url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  }), { timeoutMs: 5, nodeEnv: 'development' }));
  await assert.rejects(provider.reverse({ latitude: 7, longitude: 80 }), { kind: 'timeout', causeName: 'AbortError' });
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0][1].operation, 'reverse');
  assert.equal(warnings[0][1].kind, 'timeout');
  const production = createGeocodingProvider(options(async () => { throw undefined; }));
  await assert.rejects(production.search('Kandy', 5), { kind: 'network', causeName: null, causeMessage: null });
  assert.equal(warnings.length, 1);
});

test('search mapping rejects malformed provider entries, preserves valid coordinates and caps results', async () => {
  const rows = [null, [], { display_name: 1 }, result({ place_id: null }), result({ lat: 'not a number' }), result({ lon: 181 }), result({ lat: -91 }), ...Array.from({ length: 7 }, (_, index) => result({ place_id: `id-${index}`, lat: 7 + index, lon: 80 }))];
  const reports = await searchLocations('Kandy', { async search(query, limit) { assert.deepEqual([query, limit], ['Kandy', 5]); return rows; } });
  assert.equal(reports.length, 5);
  assert.deepEqual(reports[0], { placeId: 'id-0', displayName: 'Kandy, Sri Lanka', coordinates: { latitude: 7, longitude: 80 } });
  assert.deepEqual(await searchLocations('Kandy', { async search() { return [result()]; } }), [{ placeId: '123', displayName: 'Kandy, Sri Lanka', coordinates: { latitude: 7.2906, longitude: 80.6337 } }]);
});

test('search converts provider outages and malformed root payloads to safe 503 but propagates programming errors', async () => {
  for (const provider of [{ async search() { return {}; } }, { async search() { throw new GeocodingUnavailableError('private body'); } }]) await assert.rejects(searchLocations('Kandy', provider), { status: 503, message: 'Location search is temporarily unavailable.' });
  const failure = new Error('unexpected integration bug');
  await assert.rejects(searchLocations('Kandy', { async search() { throw failure; } }), failure);
});

test('reverse mapping preserves labels, uses coordinate fallback and handles no match or invalid coordinates', async () => {
  const coordinates = { latitude: 7, longitude: 80 };
  const provider = (payload) => ({ async reverse(value) { assert.deepEqual(value, coordinates); return payload; } });
  assert.deepEqual(await reverseGeocodeLocation(coordinates, provider(result())), { displayName: 'Kandy, Sri Lanka', coordinates: { latitude: 7.2906, longitude: 80.6337 } });
  for (const display_name of ['', '  ', undefined, null, 12]) assert.deepEqual(await reverseGeocodeLocation(coordinates, provider(result({ lat: 7, lon: 80, display_name }))), { displayName: '7.00000, 80.00000', coordinates });
  for (const payload of [null, undefined, result({ lat: 'NaN' }), result({ lon: -181 })]) assert.equal(await reverseGeocodeLocation(coordinates, provider(payload)), null);
});

test('reverse mapping rejects malformed roots/outages safely while retaining unexpected errors', async () => {
  const coordinates = { latitude: 7, longitude: 80 };
  for (const payload of [[], 'Kandy', 12]) await assert.rejects(reverseGeocodeLocation(coordinates, { async reverse() { return payload; } }), { status: 503, message: 'Reverse geocoding is temporarily unavailable.' });
  await assert.rejects(reverseGeocodeLocation(coordinates, { async reverse() { throw new GeocodingUnavailableError('private credentials'); } }), { status: 503 });
  const failure = new Error('unexpected integration bug');
  await assert.rejects(reverseGeocodeLocation(coordinates, { async reverse() { throw failure; } }), failure);
});
