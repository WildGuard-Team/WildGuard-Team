import { HttpError } from '../../../shared/http-error.js';
import { COMMUNITY_REPORT_STATUSES } from '../config/community-report.constants.js';

export function validateMyReportsQuery(query) {
  if (Object.keys(query).some((field) => field !== 'status')) {
    throw new HttpError(400, 'Only the status filter is allowed.');
  }
  if (query.status !== undefined && !COMMUNITY_REPORT_STATUSES.includes(query.status)) {
    throw new HttpError(400, 'Status must be one of: under_review, approved, rejected.');
  }
  return query.status;
}
