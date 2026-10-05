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
  return {
    port, mongodbUri, clientOrigin, jwtSecret, jwtExpiresIn, nodeEnv,
  };
}
