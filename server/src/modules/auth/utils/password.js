import bcrypt from 'bcryptjs';

const HASH_ROUNDS = 12;

export function hashPassword(password) {
  return bcrypt.hash(password, HASH_ROUNDS);
}

export function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}
