import { randomBytes } from 'node:crypto';
import { CONSERVATION_REPORT_ID_PREFIX } from '../config/conservation-report.constants.js';

export function createConservationReportId(now = new Date()) {
  const suffix = randomBytes(5).toString('hex').toUpperCase();
  return `${CONSERVATION_REPORT_ID_PREFIX}-${now.getUTCFullYear()}-${suffix}`;
}
