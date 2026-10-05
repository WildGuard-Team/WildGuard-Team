import {
  MANUAL_LOCATION_SOURCE, WEB_REPORT_SOURCE, REFERENCE_MAX_ATTEMPTS,
} from '../config/report.constants.js';
import { createReferenceNumber } from '../utils/reference-number.js';

function isReferenceCollision(error) {
  return error?.code === 11000 && (
    error.keyPattern?.referenceNumber === 1
    || Object.hasOwn(error.keyValue ?? {}, 'referenceNumber')
  );
}

function toPublicReport(report) {
  return {
    id: report.id,
    referenceNumber: report.referenceNumber,
    reportType: report.reportType,
    description: report.description,
    location: {
      locationSource: report.location.locationSource,
      manualLocation: report.location.manualLocation,
    },
    source: report.source,
    createdAt: report.createdAt,
  };
}

export async function createReport(input, reporterId, reports) {
  for (let attempt = 0; attempt < REFERENCE_MAX_ATTEMPTS; attempt += 1) {
    try {
      const report = await reports.create({
        referenceNumber: createReferenceNumber(),
        reporterId,
        reportType: input.reportType,
        description: input.description,
        location: {
          locationSource: MANUAL_LOCATION_SOURCE,
          manualLocation: input.manualLocation,
        },
        source: WEB_REPORT_SOURCE,
      });
      return toPublicReport(report);
    } catch (error) {
      if (!isReferenceCollision(error)) throw error;
    }
  }
  // The global error handler keeps persistence details out of the HTTP response.
  throw new Error('Unable to allocate a unique report reference.');
}
