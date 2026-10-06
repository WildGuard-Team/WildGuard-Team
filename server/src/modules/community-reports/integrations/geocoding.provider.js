import { GEOCODING_CACHE_TTL_MS, GEOCODING_MIN_REQUEST_INTERVAL_MS } from '../config/geocoding.config.js';

export class GeocodingUnavailableError extends Error {}

export function createGeocodingProvider({ baseUrl, userAgent, timeoutMs, fetchImplementation = globalThis.fetch }) {
  if (typeof fetchImplementation !== 'function') throw new Error('A fetch implementation is required for geocoding.');
  const cache = new Map();
  let nextRequestAt = 0;
  let rateLimitQueue = Promise.resolve();

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

  async function request(path, cacheKey) {
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
      if (!response.ok) throw new GeocodingUnavailableError('Geocoding provider is unavailable.');
      const data = await response.json();
      cache.set(cacheKey, { value: data, expiresAt: Date.now() + GEOCODING_CACHE_TTL_MS });
      if (cache.size > 50) cache.delete(cache.keys().next().value);
      return data;
    } catch (error) {
      if (error instanceof GeocodingUnavailableError) throw error;
      throw new GeocodingUnavailableError('Geocoding provider is unavailable.');
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    search(query, limit) {
      const params = new URLSearchParams({ q: query, format: 'jsonv2', addressdetails: '1', countrycodes: 'lk', limit: String(limit) });
      return request(`search?${params}`, `search:${query.toLocaleLowerCase()}`);
    },
    reverse({ latitude, longitude }) {
      const params = new URLSearchParams({ lat: String(latitude), lon: String(longitude), format: 'jsonv2', addressdetails: '1' });
      return request(`reverse?${params}`, `reverse:${latitude},${longitude}`);
    },
  };
}
