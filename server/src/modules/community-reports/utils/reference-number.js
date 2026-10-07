import { randomBytes } from 'node:crypto';
import { COMMUNITY_REPORT_REFERENCE_RANDOM_BYTES } from '../config/community-report.constants.js';

export function createCommunityReportReferenceNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = randomBytes(COMMUNITY_REPORT_REFERENCE_RANDOM_BYTES).toString('hex').toUpperCase();
  return `WG-${date}-${suffix}`;
}
