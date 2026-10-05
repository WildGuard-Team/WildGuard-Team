import { randomBytes } from 'node:crypto';
import { REFERENCE_RANDOM_BYTES } from '../config/report.constants.js';

export function createReferenceNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = randomBytes(REFERENCE_RANDOM_BYTES).toString('hex').toUpperCase();
  return `WG-${date}-${suffix}`;
}
