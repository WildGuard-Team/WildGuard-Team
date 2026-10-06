import {
  COMMUNITY_REPORT_WEB_SOURCE,
  COMMUNITY_REPORT_REFERENCE_MAX_ATTEMPTS,
} from '../config/community-report.constants.js';
import { createCommunityReportReferenceNumber } from '../utils/reference-number.js';
import { toGeoJsonPoint, toPublicLocation } from '../utils/location-mapper.js';

function isReferenceCollision(error) {
  return error?.code === 11000 && (
    error.keyPattern?.referenceNumber === 1
    || Object.hasOwn(error.keyValue ?? {}, 'referenceNumber')
  );
}

function toPublicCommunityReport(report) {
  return {
    id: report.id,
    referenceNumber: report.referenceNumber,
    reportType: report.reportType,
    description: report.description,
    location: toPublicLocation(report.location),
    source: report.source,
    createdAt: report.createdAt,
  };
}

export async function createCommunityReport(input, reporterId, communityReports) {
  for (let attempt = 0; attempt < COMMUNITY_REPORT_REFERENCE_MAX_ATTEMPTS; attempt += 1) {
    try {
      const report = await communityReports.create({
        referenceNumber: createCommunityReportReferenceNumber(),
        reporterId,
        reportType: input.reportType,
        description: input.description,
        location: {
          source: input.location.source,
          point: toGeoJsonPoint(input.location.coordinates),
          displayName: input.location.displayName,
          manualLocation: input.location.manualLocation,
        },
        source: COMMUNITY_REPORT_WEB_SOURCE,
      });
      return toPublicCommunityReport(report);
    } catch (error) {
      if (!isReferenceCollision(error)) throw error;
    }
  }
  // The global error handler keeps persistence details out of the HTTP response.
  throw new Error('Unable to allocate a unique report reference.');
}
