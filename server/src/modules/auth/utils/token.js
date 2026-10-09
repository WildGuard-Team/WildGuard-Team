import jwt from 'jsonwebtoken';

const durationUnits = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

export function getTokenExpiryMilliseconds(expiresIn) {
  const match = /^([1-9]\d*)([smhd])$/.exec(expiresIn);
  if (!match) throw new Error('Invalid JWT expiration.');
  return Number(match[1]) * durationUnits[match[2]];
}

export function createAuthToken(user, secret, expiresIn) {
  return jwt.sign({ userId: user.id, role: user.role }, secret, { expiresIn });
}

export function verifyAuthToken(token, secret) {
  const payload = jwt.verify(token, secret);
  if (!payload || typeof payload !== 'object' || typeof payload.userId !== 'string' || typeof payload.role !== 'string') {
    throw new Error('Invalid token payload.');
  }
  return { userId: payload.userId, role: payload.role };
}
