import mongoose from 'mongoose';
import { HttpError } from '../../../shared/http-error.js';
import {
  COMMUNITY_REPORT_REJECTION_REASON_MAX_LENGTH,
  COMMUNITY_REPORT_STATUSES,
  COMMUNITY_REPORT_TYPES,
} from '../config/community-report.constants.js';

export function validateManagerReportsQuery(query) {
  rejectRepeatedOrUnknown(query, ['status', 'reportType', 'search', 'startDate', 'endDate']);
  const status = optionalEnum(query.status, COMMUNITY_REPORT_STATUSES, 'Status');
  const reportType = optionalEnum(query.reportType, COMMUNITY_REPORT_TYPES, 'Report type');
  const search = optionalText(query.search, 'Search', 100);
  const startDate = optionalDate(query.startDate, 'Start date');
  const endDateValue = optionalDate(query.endDate, 'End date');
  const endDate = endDateValue ? new Date(endDateValue.getTime() + 86_400_000 - 1) : null;
  if (startDate && endDate && startDate > endDate) {
    throw new HttpError(400, 'Start date must be on or before end date.');
  }
  return { status, reportType, search, startDate, endDate };
}

export function validateManagerReportId(value) {
  if (!mongoose.isObjectIdOrHexString(value)) {
    throw new HttpError(400, 'Report ID must be a valid MongoDB ObjectId.');
  }
  return value;
}

export function validateReviewDecision(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'A review decision is required.');
  }
  rejectRepeatedOrUnknown(body, ['status', 'rejectionReason']);
  if (!['approved', 'rejected'].includes(body.status)) {
    throw new HttpError(400, 'Status must be approved or rejected.');
  }
  const rejectionReason = optionalText(
    body.rejectionReason,
    'Rejection reason',
    COMMUNITY_REPORT_REJECTION_REASON_MAX_LENGTH,
  );
  if (body.status === 'rejected' && !rejectionReason) {
    throw new HttpError(400, 'A rejection reason is required when rejecting a report.');
  }
  if (body.status === 'approved' && rejectionReason) {
    throw new HttpError(400, 'Rejection reason is only allowed when rejecting a report.');
  }
  return { status: body.status, rejectionReason };
}

function rejectRepeatedOrUnknown(value, allowed) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key) || Array.isArray(value[key])) {
      throw new HttpError(400, `Unsupported or repeated field: ${key}.`);
    }
  }
}

function optionalEnum(value, allowed, label) {
  if (value === undefined) return null;
  if (typeof value !== 'string' || !allowed.includes(value)) {
    throw new HttpError(400, `${label} must be one of: ${allowed.join(', ')}.`);
  }
  return value;
}

function optionalText(value, label, maxLength) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new HttpError(400, `${label} must be text.`);
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) {
    throw new HttpError(400, `${label} must not exceed ${maxLength} characters.`);
  }
  return normalized;
}

function optionalDate(value, label) {
  if (value === undefined) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, `${label} must use YYYY-MM-DD format.`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new HttpError(400, `${label} must be a valid date.`);
  }
  return date;
}
