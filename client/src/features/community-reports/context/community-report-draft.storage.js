import { reportTypes } from '../utils/report-options.js';
import { validateReportDetails } from '../validation/reportDetails.validation.js';

export const COMMUNITY_REPORT_DRAFT_STORAGE_KEY = 'wildguard.communityReportDraft.v1';
const supportedReportTypes = new Set(reportTypes.map(({ value }) => value));
const supportedLocationSources = new Set(['GPS', 'MAP', 'MANUAL']);

export const emptyCommunityReportDraft = Object.freeze({
  reportType: '',
  description: '',
  location: Object.freeze({ source: null, coordinates: null, displayName: '', manualLocation: '' }),
  evidence: [],
  evidenceRestoreRequired: false,
  wasRestored: false,
});

function storage() {
  try { return window.sessionStorage; } catch { return null; }
}

function validCoordinates(value) {
  return value && typeof value === 'object'
    && Number.isFinite(value.latitude) && Number.isFinite(value.longitude)
    && value.latitude >= -90 && value.latitude <= 90 && value.longitude >= -180 && value.longitude <= 180;
}

export function sanitizeRestoredDraft(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1) return null;
  if (value.reportType !== '' && !supportedReportTypes.has(value.reportType)) return null;
  if (typeof value.description !== 'string' || !value.location || typeof value.location !== 'object') return null;
  const { source, coordinates, displayName, manualLocation } = value.location;
  if (source !== null && !supportedLocationSources.has(source)) return null;
  if (coordinates !== null && !validCoordinates(coordinates)) return null;
  if (typeof displayName !== 'string' || typeof manualLocation !== 'string') return null;
  return {
    reportType: value.reportType,
    description: value.description,
    location: {
      source,
      coordinates: coordinates ? { latitude: coordinates.latitude, longitude: coordinates.longitude } : null,
      displayName,
      manualLocation,
    },
    evidence: [],
    evidenceRestoreRequired: value.hadEvidenceBeforeRefresh === true,
    wasRestored: true,
  };
}

export function loadCommunityReportDraft() {
  const currentStorage = storage();
  if (!currentStorage) return emptyCommunityReportDraft;
  try {
    const raw = currentStorage.getItem(COMMUNITY_REPORT_DRAFT_STORAGE_KEY);
    if (!raw) return emptyCommunityReportDraft;
    const restored = sanitizeRestoredDraft(JSON.parse(raw));
    if (restored) return restored;
  } catch { /* Corrupt or unavailable browser storage is not a startup failure. */ }
  try { currentStorage.removeItem(COMMUNITY_REPORT_DRAFT_STORAGE_KEY); } catch { /* Ignore storage access failures. */ }
  return emptyCommunityReportDraft;
}

export function saveCommunityReportDraft(draft) {
  const currentStorage = storage();
  if (!currentStorage) return;
  if (!draft.reportType && !draft.description && !draft.location?.source) {
    clearCommunityReportDraft();
    return;
  }
  const snapshot = {
    version: 1,
    reportType: draft.reportType,
    description: draft.description,
    location: draft.location,
    hadEvidenceBeforeRefresh: draft.evidence.length > 0 || draft.evidenceRestoreRequired,
    savedAt: new Date().toISOString(),
  };
  try { currentStorage.setItem(COMMUNITY_REPORT_DRAFT_STORAGE_KEY, JSON.stringify(snapshot)); } catch { /* A full or unavailable session store must not break reporting. */ }
}

export function clearCommunityReportDraft() {
  try { storage()?.removeItem(COMMUNITY_REPORT_DRAFT_STORAGE_KEY); } catch { /* Ignore storage access failures. */ }
}

export function hasCompleteCommunityReportDetails(draft) {
  return supportedReportTypes.has(draft.reportType) && !Object.keys(validateReportDetails(draft)).length;
}
