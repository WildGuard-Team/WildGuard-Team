import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COMMUNITY_REPORT_DRAFT_STORAGE_KEY, clearCommunityReportDraft, createDraftId, createEmptyCommunityReportDraft, hasCompleteCommunityReportDetails, loadCommunityReportDraft, sanitizeRestoredDraft, saveCommunityReportDraft } from '../../src/features/community-reports/context/community-report-draft.storage.js';

const legacyKey = 'wildguard.communityReportDraft.v1';
const fields = () => ({ reportType: 'WILDLIFE_SIGHTING', description: 'Elephant seen near the river.', incidentDateTime: '2025-01-01T08:00', location: { source: 'MAP', coordinates: { latitude: 7.2, longitude: 80.6 }, displayName: 'River bend', manualLocation: '' } });
const stored = () => ({ ...fields(), version: 2, draftId: 'draft-1', clientSubmissionId: 'retry-1', expiresAt: '2025-01-03T08:00:00Z', hadEvidenceBeforeRefresh: true });
beforeEach(() => { sessionStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(new Date('2025-01-02T08:00:00Z')); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('community report draft snapshots', () => {
  it('creates independent draft IDs and an empty draft with a usable local incident time', () => {
    const first = createEmptyCommunityReportDraft();
    const second = createEmptyCommunityReportDraft();
    expect(first.draftId).not.toBe(second.draftId);
    expect(createDraftId()).toMatch(/^[0-9a-f-]{36}$/);
    expect(first).toMatchObject({ reportType: '', description: '', location: { source: null, coordinates: null, displayName: '', manualLocation: '' }, evidence: [], evidenceRestoreRequired: false, wasRestored: false });
    expect(first.incidentDateTime).toMatch(/^2025-01-02T\d{2}:\d{2}$/);
  });

  it('saves metadata rather than raw evidence, sets a 24-hour expiry, and restores the idempotency ID', () => {
    const draft = { ...fields(), draftId: 'draft-1', clientSubmissionId: 'retry-1', evidence: [new File(['photo'], 'photo.png')] };
    expect(saveCommunityReportDraft(draft)).toBe(true);
    const snapshot = JSON.parse(sessionStorage.getItem(COMMUNITY_REPORT_DRAFT_STORAGE_KEY));
    expect(snapshot).toMatchObject({ version: 2, draftId: 'draft-1', clientSubmissionId: 'retry-1', hadEvidenceBeforeRefresh: true, savedAt: '2025-01-02T08:00:00.000Z', expiresAt: '2025-01-03T08:00:00.000Z' });
    expect(snapshot).not.toHaveProperty('evidence');
    expect(loadCommunityReportDraft()).toEqual({ ...fields(), draftId: 'draft-1', clientSubmissionId: 'retry-1', evidence: [], evidenceRestoreRequired: true, wasRestored: true });
  });

  it('preserves an evidence restoration requirement and allows a blank initial report type', () => {
    const empty = createEmptyCommunityReportDraft();
    expect(saveCommunityReportDraft({ ...empty, evidenceRestoreRequired: true })).toBe(true);
    expect(loadCommunityReportDraft()).toMatchObject({ reportType: '', evidenceRestoreRequired: true, wasRestored: true });
    const normalized = sanitizeRestoredDraft({ ...stored(), clientSubmissionId: 123, incidentDateTime: 'invalid', hadEvidenceBeforeRefresh: false });
    expect(normalized).toMatchObject({ incidentDateTime: '', evidenceRestoreRequired: false, clientSubmissionId: undefined });
  });

  it.each([
    null, [], { ...stored(), version: 1 }, { ...stored(), draftId: '' }, { ...stored(), draftId: 7 },
    { ...stored(), expiresAt: '2025-01-02T08:00:00Z' }, { ...stored(), expiresAt: 123 },
    { ...stored(), reportType: 'UNKNOWN' }, { ...stored(), description: 12 }, { ...stored(), location: null },
    { ...stored(), location: 'Kandy' }, { ...stored(), location: { ...fields().location, source: 'UNKNOWN' } },
    { ...stored(), location: { ...fields().location, coordinates: { latitude: -91, longitude: 80 } } },
    { ...stored(), location: { ...fields().location, coordinates: { latitude: 91, longitude: 80 } } },
    { ...stored(), location: { ...fields().location, coordinates: { latitude: 7, longitude: -181 } } },
    { ...stored(), location: { ...fields().location, coordinates: { latitude: 7, longitude: 181 } } },
    { ...stored(), location: { ...fields().location, coordinates: { latitude: Infinity, longitude: 80 } } },
    { ...stored(), location: { ...fields().location, coordinates: { latitude: 7, longitude: NaN } } },
    { ...stored(), location: { ...fields().location, displayName: null } },
    { ...stored(), location: { ...fields().location, manualLocation: null } },
  ])('does not restore malformed or expired snapshots', (snapshot) => {
    expect(sanitizeRestoredDraft(snapshot)).toBeNull();
  });

  it('copies only coordinate values and accepts the valid world-coordinate extremes', () => {
    for (const coordinates of [{ latitude: -90, longitude: -180, privateField: 'do not persist' }, { latitude: 90, longitude: 180 }]) {
      const result = sanitizeRestoredDraft({ ...stored(), location: { ...fields().location, coordinates } });
      expect(result.location.coordinates).toEqual({ latitude: coordinates.latitude, longitude: coordinates.longitude });
    }
  });

  it('discards a stale current snapshot and safely migrates legacy metadata', () => {
    sessionStorage.setItem(COMMUNITY_REPORT_DRAFT_STORAGE_KEY, JSON.stringify({ ...stored(), expiresAt: '2024-01-01T00:00:00Z' }));
    sessionStorage.setItem(legacyKey, JSON.stringify({ ...fields(), version: 1, hadEvidenceBeforeRefresh: true }));
    const migrated = loadCommunityReportDraft();
    expect(migrated).toMatchObject({ ...fields(), evidence: [], evidenceRestoreRequired: true, wasRestored: true });
    expect(migrated.draftId).toBeTruthy();
    expect(sessionStorage.getItem(legacyKey)).toBeNull();
    expect(JSON.parse(sessionStorage.getItem(COMMUNITY_REPORT_DRAFT_STORAGE_KEY)).draftId).toBe(migrated.draftId);
  });

  it('keeps a valid legacy snapshot when migration cannot be saved and deletes invalid legacy snapshots', () => {
    sessionStorage.setItem(legacyKey, JSON.stringify({ ...fields(), version: 1 }));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); });
    expect(loadCommunityReportDraft().wasRestored).toBe(true);
    expect(sessionStorage.getItem(legacyKey)).not.toBeNull();
    vi.restoreAllMocks();
    sessionStorage.setItem(legacyKey, JSON.stringify({ ...fields(), version: 7 }));
    expect(loadCommunityReportDraft().wasRestored).toBe(false);
    expect(sessionStorage.getItem(legacyKey)).toBeNull();
  });

  it('recovers from corrupt JSON by clearing both stored versions', () => {
    sessionStorage.setItem(COMMUNITY_REPORT_DRAFT_STORAGE_KEY, '{not-json');
    sessionStorage.setItem(legacyKey, JSON.stringify({ ...fields(), version: 1 }));
    expect(loadCommunityReportDraft().wasRestored).toBe(false);
    expect(sessionStorage.getItem(COMMUNITY_REPORT_DRAFT_STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem(legacyKey)).toBeNull();
  });

  it('handles denied session storage, failed writes, and failed clearing without crashing', () => {
    vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => { throw new DOMException('Storage denied', 'SecurityError'); });
    expect(loadCommunityReportDraft().wasRestored).toBe(false);
    expect(saveCommunityReportDraft({ ...fields(), draftId: 'draft-1', evidence: [] })).toBe(false);
    expect(() => clearCommunityReportDraft()).not.toThrow();
    vi.restoreAllMocks();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); });
    expect(saveCommunityReportDraft({ ...fields(), draftId: 'draft-1', evidence: [] })).toBe(false);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('denied'); });
    expect(() => clearCommunityReportDraft()).not.toThrow();
  });

  it('recognizes completeness only when both report type and all details are valid', () => {
    expect(hasCompleteCommunityReportDetails(fields())).toBe(true);
    expect(hasCompleteCommunityReportDetails({ ...fields(), reportType: '' })).toBe(false);
    expect(hasCompleteCommunityReportDetails({ ...fields(), description: 'short' })).toBe(false);
    clearCommunityReportDraft();
    expect(loadCommunityReportDraft().wasRestored).toBe(false);
  });
});
