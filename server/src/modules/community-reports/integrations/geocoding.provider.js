import { GEOCODING_CACHE_TTL_MS, GEOCODING_MIN_REQUEST_INTERVAL_MS } from '../config/geocoding.config.js';

const diagnosticBodyLimit = 240;

export class GeocodingUnavailableError extends Error {
  constructor(message, { kind = 'network', status = null, body = null, causeName = null, causeMessage = null } = {}) {
    super(message);
    this.name = 'GeocodingUnavailableError';
    this.kind = kind;
    this.status = status;
    this.body = body;
    this.causeName = causeName;
    this.causeMessage = causeMessage;
  }
}

function diagnosticBody(text) {
  if (!text) return null;
  return text.replace(/\s+/g, ' ').slice(0, diagnosticBodyLimit);
}

function retryAfterMilliseconds(value) {
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : Math.max(0, timestamp - Date.now());
}

function providerFailure(error, controller) {
  if (error instanceof GeocodingUnavailableError) return error;
  if (controller.signal.aborted) return new GeocodingUnavailableError('Geocoding request timed out.', {
    kind: 'timeout', causeName: error?.name ?? null, causeMessage: error?.message ?? null,
  });
  return new GeocodingUnavailableError('Geocoding network request failed.', {
    kind: 'network', causeName: error?.name ?? null, causeMessage: error?.message ?? null,
  });
}

export function createGeocodingProvider({ baseUrl, userAgent, timeoutMs, nodeEnv = 'production', fetchImplementation = globalThis.fetch }) {
  if (typeof fetchImplementation !== 'function') throw new Error('A fetch implementation is required for geocoding.');
  const cache = new Map();
  let nextRequestAt = 0;
  let rateLimitQueue = Promise.resolve();

  function logDiagnostic(operation, error) {
    if (nodeEnv !== 'development') return;
    console.warn('Geocoding provider failure', {
      operation,
      errorName: error.name,
      errorMessage: error.message,
      causeName: error.causeName,
      causeMessage: error.causeMessage,
      kind: error.kind,
      providerStatus: error.status,
      providerBody: error.body,
    });
  }

  async function waitForProviderSlot() {
    let release;
    const previous = rateLimitQueue;
    rateLimitQueue = new Promise((resolve) => { release = resolve; });
    await previous;
    const waitMs = Math.max(0, nextRequestAt - Date.now());
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
    nextRequestAt = Date.now() + GEOCODING_MIN_REQUEST_INTERVAL_MS;
    release();
  }

  async function request({ path, cacheKey, operation }) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    cache.delete(cacheKey);
    await waitForProviderSlot();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImplementation(new URL(path, `${baseUrl}/`), {
        headers: { Accept: 'application/json', 'User-Agent': userAgent },
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = diagnosticBody(await response.text().catch(() => ''));
        if (response.status === 429) {
          nextRequestAt = Math.max(nextRequestAt, Date.now() + retryAfterMilliseconds(response.headers.get('retry-after')));
        }
        const kind = response.status === 403 ? 'provider-forbidden'
          : response.status === 429 ? 'provider-rate-limit'
            : response.status >= 500 ? 'provider-server'
              : 'provider-response';
        throw new GeocodingUnavailableError('Geocoding provider is unavailable.', { kind, status: response.status, body });
      }
      const data = await response.json();
      cache.set(cacheKey, { value: data, expiresAt: Date.now() + GEOCODING_CACHE_TTL_MS });
      if (cache.size > 50) cache.delete(cache.keys().next().value);
      return data;
    } catch (error) {
      const failure = providerFailure(error, controller);
      logDiagnostic(operation, failure);
      throw failure;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    search(query, limit) {
      const params = new URLSearchParams({ q: query, format: 'jsonv2', addressdetails: '1', countrycodes: 'lk', limit: String(limit) });
      return request({ path: `search?${params}`, cacheKey: `search:${query.toLocaleLowerCase()}`, operation: 'search' });
    },
    reverse({ latitude, longitude }) {
      const params = new URLSearchParams({ lat: String(latitude), lon: String(longitude), format: 'jsonv2', addressdetails: '1' });
      return request({ path: `reverse?${params}`, cacheKey: `reverse:${latitude},${longitude}`, operation: 'reverse' });
    },
  };
}
