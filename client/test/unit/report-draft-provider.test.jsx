import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportDraftProvider } from '../../src/features/community-reports/context/ReportDraftContext.jsx';
import { useReportDraft } from '../../src/features/community-reports/context/useReportDraft.js';
import * as storage from '../../src/features/community-reports/context/community-report-draft.storage.js';
import * as evidenceStore from '../../src/features/community-reports/services/evidence-draft.indexeddb.js';

const mock = vi.hoisted(() => ({ auth: { user: { id: 'owner-1' }, isCheckingSession: false }, initialDraft: null }));
vi.mock('../../src/context/useAuth.js', () => ({ useAuth: () => mock.auth }));
vi.mock('../../src/features/community-reports/context/community-report-draft.storage.js', () => ({
  loadCommunityReportDraft: vi.fn(() => mock.initialDraft),
  createEmptyCommunityReportDraft: vi.fn(() => ({ draftId: 'new-draft', reportType: '', description: '', location: { source: null, coordinates: null, displayName: '', manualLocation: '' }, evidence: [], evidenceRestoreRequired: false })),
  saveCommunityReportDraft: vi.fn(), clearCommunityReportDraft: vi.fn(),
}));
vi.mock('../../src/features/community-reports/services/evidence-draft.indexeddb.js', () => ({
  deleteExpiredEvidenceDrafts: vi.fn(), clearOwnerEvidenceDrafts: vi.fn(), clearEvidenceDraftFiles: vi.fn(), loadEvidenceDraftFiles: vi.fn(), saveEvidenceDraftFiles: vi.fn(),
}));
let context;
function Consumer() {
  context = useReportDraft();
  return <div><output aria-label="hydration">{context.evidenceHydrationStatus}</output><output aria-label="evidence count">{context.draft.evidence.length}</output><output aria-label="description">{context.draft.description}</output><output aria-label="restore error">{context.evidenceRestoreError}</output></div>;
}
function setup() { return render(<ReportDraftProvider><Consumer /></ReportDraftProvider>); }
const image = () => new File(['pixels'], 'deer.png', { type: 'image/png', lastModified: 1 });
beforeEach(() => {
  vi.clearAllMocks(); mock.auth = { user: { id: 'owner-1' }, isCheckingSession: false };
  mock.initialDraft = { draftId: 'restored-draft', description: 'Observed deer', reportType: 'WILDLIFE_SIGHTING', location: { source: 'MAP', coordinates: { latitude: 7, longitude: 80 }, displayName: '', manualLocation: '' }, evidence: [], evidenceRestoreRequired: false, wasRestored: false };
  for (const fn of Object.values(evidenceStore)) if (typeof fn === 'function') fn.mockResolvedValue(undefined);
});

describe('report draft provider', () => {
  it('requires a provider rather than silently manufacturing a draft', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(useReportDraft)).toThrow('useReportDraft must be used within ReportDraftProvider.'); error.mockRestore();
  });
  it('updates incident fields and locations, supports coordinate-safe functional updates and skips a stale null update', async () => {
    setup(); await waitFor(() => expect(context.evidenceHydrationStatus).toBe('ready'));
    act(() => context.updateDraft({ description: 'New report description' }));
    expect(screen.getByLabelText('description').textContent).toBe('New report description');
    act(() => context.updateLocation({ displayName: 'Village' })); expect(context.draft.location.coordinates).toEqual({ latitude: 7, longitude: 80 });
    act(() => context.updateLocation((current) => current.coordinates.latitude === 7 ? { source: 'GPS' } : null)); expect(context.draft.location.source).toBe('GPS');
    const before = context.draft; act(() => context.updateLocation(() => null)); expect(context.draft).toBe(before);
    expect(storage.saveCommunityReportDraft).toHaveBeenLastCalledWith(expect.objectContaining({ description: 'New report description' }));
  });
  it('selects/persists evidence, allows explicit removal, clears drafts, and resets submitted results', async () => {
    setup(); await waitFor(() => expect(context.evidenceHydrationStatus).toBe('ready'));
    const file = image(); act(() => context.setEvidence([file]));
    await waitFor(() => expect(evidenceStore.saveEvidenceDraftFiles).toHaveBeenCalledWith({ ownerId: 'owner-1', draftId: 'restored-draft', files: [file] }));
    expect(context.draft.evidenceRestoreRequired).toBe(false); expect(context.draft.wasRestored).toBe(false);
    act(() => context.continueWithoutEvidence()); expect(context.draft.evidence).toEqual([]);
    expect(evidenceStore.clearEvidenceDraftFiles).toHaveBeenCalledWith({ ownerId: 'owner-1', draftId: 'restored-draft' });
    act(() => context.setSubmittedReport({ referenceNumber: 'WG-1' }));
    act(() => context.clearDraft()); expect(context.draft.draftId).toBe('new-draft'); expect(context.submittedReport.referenceNumber).toBe('WG-1');
    act(() => context.resetDraft()); expect(context.submittedReport).toBeNull(); expect(storage.clearCommunityReportDraft).toHaveBeenCalled();
  });
  it('restores genuine files under the current owner and reports ready only after hydration completes', async () => {
    mock.initialDraft.evidenceRestoreRequired = true;
    let resolve; evidenceStore.loadEvidenceDraftFiles.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    setup(); expect(screen.getByLabelText('hydration').textContent).toBe('loading');
    expect(evidenceStore.loadEvidenceDraftFiles).toHaveBeenCalledWith({ ownerId: 'owner-1', draftId: 'restored-draft' });
    const file = image(); await act(async () => { resolve([file]); });
    expect(context.evidenceHydrationStatus).toBe('ready'); expect(context.draft.evidence).toEqual([file]); expect(context.draft.evidenceRestoreRequired).toBe(false);
  });
  it.each([undefined, [], [new File(['bad'], 'script.js', { type: 'application/javascript' })]])('requires explicit reselection when restored evidence is missing/invalid: %j', async (files) => {
    mock.initialDraft.evidenceRestoreRequired = true; evidenceStore.loadEvidenceDraftFiles.mockResolvedValueOnce(files);
    setup(); await waitFor(() => expect(context.evidenceHydrationStatus).toBe('failed'));
    expect(context.draft.evidence).toEqual([]); expect(context.draft.evidenceRestoreRequired).toBe(true);
    expect(screen.getByLabelText('restore error').textContent).toContain('evidence files could not be recovered');
    act(() => context.continueWithoutEvidence()); expect(context.evidenceHydrationStatus).toBe('ready'); expect(context.evidenceRestoreError).toBe(''); expect(context.draft.evidenceRestoreRequired).toBe(false);
  });
  it('warns about persistence errors without dropping selected evidence', async () => {
    evidenceStore.saveEvidenceDraftFiles.mockRejectedValueOnce(new Error('Quota exceeded'));
    setup(); await waitFor(() => expect(context.evidenceHydrationStatus).toBe('ready'));
    const file = image(); act(() => context.setEvidence([file]));
    await waitFor(() => expect(context.evidenceRestoreError).toContain('could not be saved for refresh recovery'));
    expect(context.draft.evidence).toEqual([file]);
    act(() => context.setEvidence([image()])); await waitFor(() => expect(context.evidenceRestoreError).toBe(''));
  });
  it('waits for session checking and isolates drafts when the authenticated owner changes or logs out', async () => {
    mock.auth.isCheckingSession = true;
    const view = setup(); expect(context.evidenceHydrationStatus).toBe('idle'); expect(evidenceStore.clearEvidenceDraftFiles).not.toHaveBeenCalled();
    mock.auth = { user: { id: 'owner-1' }, isCheckingSession: false };
    view.rerender(<ReportDraftProvider><Consumer /></ReportDraftProvider>); await waitFor(() => expect(context.evidenceHydrationStatus).toBe('ready'));
    mock.auth = { user: { id: 'owner-2' }, isCheckingSession: false };
    view.rerender(<ReportDraftProvider><Consumer /></ReportDraftProvider>);
    expect(evidenceStore.clearOwnerEvidenceDrafts).toHaveBeenCalledWith('owner-1'); expect(context.draft.description).toBe('');
    mock.auth = { user: null, isCheckingSession: false };
    view.rerender(<ReportDraftProvider><Consumer /></ReportDraftProvider>);
    expect(evidenceStore.clearOwnerEvidenceDrafts).toHaveBeenCalledWith('owner-2'); expect(context.draft.evidence).toEqual([]);
    act(() => context.clearDraft()); expect(context.evidenceHydrationStatus).toBe('ready');
  });
  it.each(['resolve', 'reject'])('does not restore a discarded/unmounted draft from a late %s', async (outcome) => {
    mock.initialDraft.evidenceRestoreRequired = true;
    let resolve; let reject; evidenceStore.loadEvidenceDraftFiles.mockImplementationOnce(() => new Promise((done, fail) => { resolve = done; reject = fail; }));
    const { unmount } = setup(); unmount();
    await act(async () => { if (outcome === 'resolve') resolve([image()]); else reject(new Error('Late database error')); });
    expect(evidenceStore.saveEvidenceDraftFiles).not.toHaveBeenCalled();
  });
  it('ignores optional expiry/clear failures and clears signed-out drafts without leaking recovery data', async () => {
    mock.auth.user = null; evidenceStore.deleteExpiredEvidenceDrafts.mockRejectedValueOnce(new Error('Database blocked'));
    setup(); await waitFor(() => expect(context.evidenceHydrationStatus).toBe('ready'));
    expect(storage.clearCommunityReportDraft).toHaveBeenCalled(); expect(context.draft.draftId).toBe('new-draft');
    expect(evidenceStore.loadEvidenceDraftFiles).not.toHaveBeenCalled();
  });
});
