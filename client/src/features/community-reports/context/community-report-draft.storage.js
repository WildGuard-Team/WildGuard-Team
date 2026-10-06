import { reportTypes } from '../utils/report-options.js';
import { validateReportDetails } from '../validation/reportDetails.validation.js';

export const COMMUNITY_REPORT_DRAFT_STORAGE_KEY = 'wildguard.communityReportDraft.v2';
const legacyStorageKey = 'wildguard.communityReportDraft.v1';
const supportedReportTypes = new Set(reportTypes.map(({ value }) => value));
const supportedLocationSources = new Set(['GPS', 'MAP', 'MANUAL']);
const expiryMs = 24 * 60 * 60 * 1000;

export function createDraftId() { return crypto.randomUUID(); }
export function createEmptyCommunityReportDraft() {
  return { draftId: createDraftId(), reportType: '', description: '', location: { source: null, coordinates: null, displayName: '', manualLocation: '' }, evidence: [], evidenceRestoreRequired: false, wasRestored: false };
}
function storage() { try { return window.sessionStorage; } catch { return null; } }
function validCoordinates(value) { return value && typeof value === 'object' && Number.isFinite(value.latitude) && Number.isFinite(value.longitude) && value.latitude >= -90 && value.latitude <= 90 && value.longitude >= -180 && value.longitude <= 180; }
function sanitizeFields(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || (value.reportType !== '' && !supportedReportTypes.has(value.reportType)) || typeof value.description !== 'string' || !value.location || typeof value.location !== 'object') return null;
  const { source, coordinates, displayName, manualLocation } = value.location;
  if (source !== null && !supportedLocationSources.has(source)) return null;
  if (coordinates !== null && !validCoordinates(coordinates)) return null;
  if (typeof displayName !== 'string' || typeof manualLocation !== 'string') return null;
  return { reportType: value.reportType, description: value.description, location: { source, coordinates: coordinates ? { latitude: coordinates.latitude, longitude: coordinates.longitude } : null, displayName, manualLocation } };
}
export function sanitizeRestoredDraft(value) {
  const fields = sanitizeFields(value);
  if (!fields || value.version !== 2 || typeof value.draftId !== 'string' || !value.draftId || typeof value.expiresAt !== 'string' || Date.parse(value.expiresAt) <= Date.now()) return null;
  return { ...fields, draftId: value.draftId, evidence: [], evidenceRestoreRequired: value.hadEvidenceBeforeRefresh === true, wasRestored: true };
}
export function loadCommunityReportDraft() {
  const currentStorage = storage();
  if (!currentStorage) return createEmptyCommunityReportDraft();
  try {
    const current = currentStorage.getItem(COMMUNITY_REPORT_DRAFT_STORAGE_KEY);
    if (current) { const restored = sanitizeRestoredDraft(JSON.parse(current)); if (restored) return restored; currentStorage.removeItem(COMMUNITY_REPORT_DRAFT_STORAGE_KEY); }
    const legacy = currentStorage.getItem(legacyStorageKey);
    if (legacy) {
      const legacyValue = JSON.parse(legacy); const fields = legacyValue?.version === 1 ? sanitizeFields(legacyValue) : null;
      if (fields) { const migrated = { ...fields, draftId: createDraftId(), evidence: [], evidenceRestoreRequired: legacyValue.hadEvidenceBeforeRefresh === true, wasRestored: true }; if (saveCommunityReportDraft(migrated)) currentStorage.removeItem(legacyStorageKey); return migrated; }
      currentStorage.removeItem(legacyStorageKey);
    }
  } catch { clearCommunityReportDraft(); }
  return createEmptyCommunityReportDraft();
}
export function saveCommunityReportDraft(draft) {
  const currentStorage = storage(); if (!currentStorage) return false;
  if (!draft.reportType && !draft.description && !draft.location?.source) { clearCommunityReportDraft(); return true; }
  const now = new Date();
  const snapshot = { version: 2, draftId: draft.draftId, reportType: draft.reportType, description: draft.description, location: draft.location, hadEvidenceBeforeRefresh: draft.evidence.length > 0 || draft.evidenceRestoreRequired, savedAt: now.toISOString(), expiresAt: new Date(now.getTime() + expiryMs).toISOString() };
  try { currentStorage.setItem(COMMUNITY_REPORT_DRAFT_STORAGE_KEY, JSON.stringify(snapshot)); return true; } catch { return false; }
}
export function clearCommunityReportDraft() { try { storage()?.removeItem(COMMUNITY_REPORT_DRAFT_STORAGE_KEY); storage()?.removeItem(legacyStorageKey); } catch { /* Ignore unavailable storage. */ } }
export function hasCompleteCommunityReportDetails(draft) { return supportedReportTypes.has(draft.reportType) && !Object.keys(validateReportDetails(draft)).length; }
