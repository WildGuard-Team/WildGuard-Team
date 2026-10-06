export function readConfig(env) {
  const required = ['PORT', 'MONGODB_URI', 'CLIENT_ORIGIN', 'JWT_SECRET', 'JWT_EXPIRES_IN'];
  for (const key of required) {
    if (!env[key]?.trim()) throw new Error(`Missing ${key}. Copy server/.env.example to server/.env and configure it.`);
  }

  const port = Number(env.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  const mongodbUri = env.MONGODB_URI.trim();
  if (!/^mongodb(?:\+srv)?:\/\/[^/]+\/[^?\s/]+(?:\?.*)?$/.test(mongodbUri)) {
    throw new Error('MONGODB_URI must be a MongoDB URI with an explicit database name, such as wildguard.');
  }
  const clientOrigin = env.CLIENT_ORIGIN.trim();
  let origin;
  try { origin = new URL(clientOrigin); } catch { /* Report a consistent configuration error below. */ }
  if (!origin || !['http:', 'https:'].includes(origin.protocol) || origin.origin !== clientOrigin) {
    throw new Error('CLIENT_ORIGIN must be an HTTP(S) origin without a path or trailing slash.');
  }
  const jwtSecret = env.JWT_SECRET.trim();
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters.');
  }
  const jwtExpiresIn = env.JWT_EXPIRES_IN.trim();
  if (!/^[1-9]\d*[smhd]$/.test(jwtExpiresIn)) {
    throw new Error('JWT_EXPIRES_IN must be a positive duration such as 24h.');
  }
  const nodeEnv = env.NODE_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV must be development, test, or production.');
  }
  const geocodingBaseUrl = readHttpUrl(requiredText(env.GEOCODING_BASE_URL, 'GEOCODING_BASE_URL'), 'GEOCODING_BASE_URL');
  const geocodingUserAgent = requiredText(env.GEOCODING_USER_AGENT, 'GEOCODING_USER_AGENT');
  if (geocodingUserAgent.length > 200 || /^(node|undici|mozilla|wildguard)$/i.test(geocodingUserAgent) || /YOUR_EMAIL|example\.invalid/i.test(geocodingUserAgent)) {
    throw new Error('GEOCODING_USER_AGENT must be an identifying value of at most 200 characters.');
  }
  const geocodingTimeoutMs = Number(env.GEOCODING_TIMEOUT_MS ?? 10000);
  if (!Number.isInteger(geocodingTimeoutMs) || geocodingTimeoutMs < 1000 || geocodingTimeoutMs > 30000) {
    throw new Error('GEOCODING_TIMEOUT_MS must be an integer between 1000 and 30000.');
  }
  return {
    port, mongodbUri, clientOrigin, jwtSecret, jwtExpiresIn, nodeEnv,
    geocodingBaseUrl, geocodingUserAgent, geocodingTimeoutMs,
  };
}

function requiredText(value, name) {
  if (!value?.trim()) throw new Error(`Missing ${name}. Configure it in server/.env.`);
  return value.trim();
}

function readHttpUrl(value, name) {
  let url;
  try { url = new URL(value); } catch { /* Report the stable configuration error below. */ }
  if (!url || !['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`${name} must be an HTTP(S) URL.`);
  }
  return url.toString().replace(/\/$/, '');
}
