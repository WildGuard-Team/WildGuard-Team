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

// Coalesce concurrent uploads in this process; MongoDB remains the authority
// for uniqueness across restarts and multiple server processes.
const submissionsInFlight = new WeakMap();

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
  let inFlight = submissionsInFlight.get(communityReports);
  if (!inFlight) {
    inFlight = new Map();
    submissionsInFlight.set(communityReports, inFlight);
  }
  const key = JSON.stringify([String(reporterId), input.clientSubmissionId]);
  const pending = inFlight.get(key);
  if (pending) return { ...await pending, duplicateRetry: true };

  const submission = submitCommunityReport(input, reporterId, communityReports, files, cloudinary, nodeEnv);
  inFlight.set(key, submission);
  try {
    return await submission;
  } finally {
    inFlight.delete(key);
  }
}

async function submitCommunityReport(input, reporterId, communityReports, files, cloudinary, nodeEnv) {
  const existing = await communityReports.findBySubmission(reporterId, input.clientSubmissionId);
  if (existing) return { report: toPublicCommunityReport(existing), duplicateRetry: true };

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
          clientSubmissionId: input.clientSubmissionId,
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
        return { report: toPublicCommunityReport(report) };
      } catch (error) {
        if (error?.code === 11000) {
          const existing = await communityReports.findBySubmission(reporterId, input.clientSubmissionId);
          if (existing) {
            await rollbackEvidence(uploadedAssets, cloudinary, nodeEnv, 'duplicate');
            return { report: toPublicCommunityReport(existing), duplicateRetry: true };
          }
        }
        if (!isReferenceCollision(error)) throw error;
      }
    }
  } catch {
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
