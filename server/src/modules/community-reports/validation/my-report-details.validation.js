import mongoose from 'mongoose';
import { HttpError } from '../../../shared/http-error.js';

export function validateMyReportId(reportId) {
  if (typeof reportId !== 'string' || !mongoose.isObjectIdOrHexString(reportId)) {
    throw new HttpError(400, 'Report ID must be a valid MongoDB ObjectId.');
  }
  return reportId;
}
