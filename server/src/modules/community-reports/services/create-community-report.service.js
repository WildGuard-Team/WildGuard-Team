import {
  COMMUNITY_REPORT_WEB_SOURCE,
  COMMUNITY_REPORT_REFERENCE_MAX_ATTEMPTS,
} from '../config/community-report.constants.js';
import { createCommunityReportReferenceNumber } from '../utils/reference-number.js';
import { toGeoJsonPoint, toPublicLocation } from '../utils/location-mapper.js';
import { toPublicEvidence } from '../utils/evidence-mapper.js';
import { uploadEvidenceFiles, validateEvidenceFiles } from './evidence-upload.service.js';
import { deleteEvidenceAssets } from './evidence-delete.service.js';
import { HttpError } from '../../../shared/http-error.js';

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
    incidentDateTime: report.incidentDateTime?.toISOString() ?? null,
    location: toPublicLocation(report.location),
    evidence: (report.evidence ?? []).map(toPublicEvidence),
    source: report.source,
    createdAt: report.createdAt,
  };
}

export async function createCommunityReport(input, reporterId, communityReports, files = [], cloudinary, nodeEnv = 'production') {
  validateEvidenceFiles(files);
  const uploadedAssets = [];
  let evidence;
  try {
    evidence = files.length
      ? await uploadEvidenceFiles(files, cloudinary, (asset) => uploadedAssets.push(asset), nodeEnv)
      : [];
  } catch (error) {
    await rollbackEvidence(uploadedAssets, cloudinary, nodeEnv, 'upload');
    if (error instanceof HttpError) throw error;
    throw new HttpError(503, 'Evidence upload is temporarily unavailable.');
  }
  try {
    for (let attempt = 0; attempt < COMMUNITY_REPORT_REFERENCE_MAX_ATTEMPTS; attempt += 1) {
      try {
        const report = await communityReports.create({
          referenceNumber: createCommunityReportReferenceNumber(),
          reporterId,
          reportType: input.reportType,
          description: input.description,
          incidentDateTime: input.incidentDateTime,
          location: {
            source: input.location.source,
            point: toGeoJsonPoint(input.location.coordinates),
            displayName: input.location.displayName,
            manualLocation: input.location.manualLocation,
          },
          evidence,
          source: COMMUNITY_REPORT_WEB_SOURCE,
        });
        return toPublicCommunityReport(report);
      } catch (error) {
        if (!isReferenceCollision(error)) throw error;
      }
    }
  } catch (error) {
    await rollbackEvidence(uploadedAssets, cloudinary, nodeEnv, 'persistence');
    throw new HttpError(500, 'The report could not be saved.');
  }
  await rollbackEvidence(uploadedAssets, cloudinary, nodeEnv, 'persistence');
  throw new HttpError(500, 'The report could not be saved.');
}

async function rollbackEvidence(assets, cloudinary, nodeEnv, operation) {
  if (!assets.length) return;
  try {
    await deleteEvidenceAssets(assets, cloudinary);
  } catch (error) {
    if (nodeEnv === 'development') console.warn('Evidence rollback failed', {
      operation, errorName: error?.name, errorMessage: error?.message,
    });
  }
}
