// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBDatabase, IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { deletePendingReport, getPendingReport, getPendingReports, restorePendingSubmission, savePendingReport } from '../../src/features/community-reports/services/pending-reports.indexeddb.js';
import { clearEvidenceDraftFiles, clearOwnerEvidenceDrafts, deleteExpiredEvidenceDrafts, evidenceDraftIndexedDb, loadEvidenceDraftFiles, openEvidenceDraftDatabase, saveEvidenceDraftFiles } from '../../src/features/community-reports/services/evidence-draft.indexeddb.js';

beforeEach(() => { vi.stubGlobal('indexedDB', new IDBFactory()); vi.stubGlobal('navigator', {}); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const report = (clientSubmissionId = 'retry-1') => ({ clientSubmissionId, reportType: 'WILDLIFE_SIGHTING', description: 'Elephant near the river.', incidentDateTime: '2025-01-15T10:30:00Z', location: { source: 'MAP', coordinates: { latitude: 7, longitude: 80 } }, evidence: [new File(['photo bytes'], 'photo.png', { type: 'image/png', lastModified: 123 })] });
const requestResult = (request) => new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });

async function putEvidenceRecord(record) {
  const database = await openEvidenceDraftDatabase();
  const transaction = database.transaction(evidenceDraftIndexedDb.storeName, 'readwrite');
  const completed = new Promise((resolve, reject) => { transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error); });
  await requestResult(transaction.objectStore(evidenceDraftIndexedDb.storeName).put(record));
  await completed;
  database.close();
}

function failOpen(error, blocked = false) {
  vi.stubGlobal('indexedDB', { open: () => {
    const request = { error };
    queueMicrotask(() => blocked ? request.onblocked() : request.onerror());
    return request;
  } });
}

describe('owner-scoped offline pending reports', () => {
  it('saves and restores file bytes and metadata, preserving the UTC time and submission ID for retries', async () => {
    const submission = report();
    const saved = await savePendingReport('owner-a', submission);
    expect(saved).toMatchObject({ ownerId: 'owner-a', clientSubmissionId: 'retry-1', status: 'offline_pending', incidentDateTime: submission.incidentDateTime });
    const loaded = await getPendingReport('owner-a', 'retry-1');
    const restored = restorePendingSubmission(loaded);
    expect(restored).toMatchObject({ clientSubmissionId: submission.clientSubmissionId, reportType: submission.reportType, description: submission.description, incidentDateTime: submission.incidentDateTime, location: submission.location });
    expect(restored.evidence[0]).toMatchObject({ name: 'photo.png', type: 'image/png', lastModified: 123 });
    expect(await restored.evidence[0].text()).toBe('photo bytes');
    expect(await getPendingReports('owner-a')).toHaveLength(1);
  });

  it('upserts one retry record without changing its saved-at time and isolates two owners sharing an ID', async () => {
    const original = await savePendingReport('owner-a', report());
    await savePendingReport('owner-a', { ...report(), description: 'Updated description.' });
    await savePendingReport('owner-b', report());
    const owned = await getPendingReports('owner-a');
    expect(owned).toHaveLength(1);
    expect(owned[0]).toMatchObject({ savedAt: original.savedAt, description: 'Updated description.' });
    expect(await getPendingReport('owner-c', 'retry-1')).toBeUndefined();
    await deletePendingReport('owner-a', 'retry-1');
    expect(await getPendingReports('owner-a')).toEqual([]);
    expect(await getPendingReports('owner-b')).toHaveLength(1);
    await deletePendingReport('owner-a', 'nonexistent');
  });

  it('lists only pending records, not previously submitted or unrelated owner records', async () => {
    const saved = await savePendingReport('owner-a', report());
    await savePendingReport('owner-a', report('pending-2'));
    await savePendingReport('owner-b', report());
    const open = indexedDB.open('wildguard-pending-reports', 1);
    const database = await requestResult(open);
    const transaction = database.transaction('reports', 'readwrite');
    const complete = new Promise((resolve) => { transaction.oncomplete = resolve; });
    transaction.objectStore('reports').put({ ...saved, status: 'submitted' });
    await complete;
    database.close();
    expect((await getPendingReports('owner-a')).map(({ clientSubmissionId }) => clientSubmissionId)).toEqual(['pending-2']);
  });

  it('requires a signed-in owner and a nonblank string submission ID before opening storage', async () => {
    for (const clientSubmissionId of ['', ' ', undefined, 5]) await expect(savePendingReport('owner-a', { ...report(), clientSubmissionId })).rejects.toThrow('submission id');
    await expect(savePendingReport('', report())).rejects.toThrow('Sign in');
    await expect(getPendingReports(null)).rejects.toThrow('Sign in');
  });

  it('surfaces unavailable or blocked storage so the UI does not falsely claim that a report was saved', async () => {
    const error = new DOMException('Storage denied', 'SecurityError');
    failOpen(error);
    await expect(savePendingReport('owner-a', report())).rejects.toBe(error);
    failOpen(null, true);
    await expect(getPendingReports('owner-a')).rejects.toThrow('Close other WildGuard tabs');
  });

  it('rejects aborted writes and always closes the database', async () => {
    const originalTransaction = IDBDatabase.prototype.transaction;
    const close = vi.spyOn(IDBDatabase.prototype, 'close');
    vi.spyOn(IDBDatabase.prototype, 'transaction').mockImplementation(function (...args) {
      const transaction = originalTransaction.apply(this, args);
      if (args[1] === 'readwrite' && args[0] === 'reports') queueMicrotask(() => transaction.abort());
      return transaction;
    });
    await expect(savePendingReport('owner-a', report())).rejects.toThrow('Unable to save reports');
    expect(close).toHaveBeenCalled();
  });

  it('closes stale database connections when IndexedDB receives a version-change event', async () => {
    let opened;
    const originalOpen = indexedDB.open.bind(indexedDB);
    vi.spyOn(indexedDB, 'open').mockImplementation((...args) => {
      const request = originalOpen(...args);
      request.addEventListener('success', () => { opened = request.result; });
      return request;
    });
    const close = vi.spyOn(IDBDatabase.prototype, 'close');
    await savePendingReport('owner-a', report());
    const closesBefore = close.mock.calls.length;
    opened.onversionchange();
    expect(close.mock.calls.length).toBe(closesBefore + 1);
  });
});

describe('temporary evidence drafts', () => {
  it('round-trips file bytes and metadata, isolates owners/drafts, and clears only the requested draft', async () => {
    const files = report().evidence;
    await saveEvidenceDraftFiles({ ownerId: 'owner-a', draftId: 'draft-1', files });
    await saveEvidenceDraftFiles({ ownerId: 'owner-b', draftId: 'draft-1', files: [] });
    const restored = await loadEvidenceDraftFiles({ ownerId: 'owner-a', draftId: 'draft-1' });
    expect(restored[0]).toMatchObject({ name: files[0].name, type: files[0].type, lastModified: files[0].lastModified, size: files[0].size });
    expect(await restored[0].text()).toBe('photo bytes');
    expect(await loadEvidenceDraftFiles({ ownerId: 'owner-c', draftId: 'draft-1' })).toBeNull();
    await clearEvidenceDraftFiles({ ownerId: 'owner-a', draftId: 'draft-1' });
    expect(await loadEvidenceDraftFiles({ ownerId: 'owner-a', draftId: 'draft-1' })).toBeNull();
    expect(await loadEvidenceDraftFiles({ ownerId: 'owner-b', draftId: 'draft-1' })).toEqual([]);
  });

  it('uses quota estimates when available and rejects insufficient space before writing', async () => {
    vi.stubGlobal('navigator', { storage: { estimate: vi.fn().mockResolvedValue({ quota: 10, usage: 1 }) } });
    await expect(saveEvidenceDraftFiles({ ownerId: 'owner-a', draftId: 'draft-1', files: report().evidence })).rejects.toMatchObject({ name: 'QuotaExceededError' });
    navigator.storage.estimate.mockResolvedValue({ quota: 100 });
    await expect(saveEvidenceDraftFiles({ ownerId: 'owner-a', draftId: 'draft-1', files: report().evidence })).resolves.toBeTruthy();
    navigator.storage.estimate.mockResolvedValue({});
    await expect(saveEvidenceDraftFiles({ ownerId: 'owner-a', draftId: 'draft-2', files: [] })).resolves.toBeTruthy();
  });

  it('expires drafts at the exact deadline and deletes expired records without deleting fresh drafts', async () => {
    const now = Date.now();
    await putEvidenceRecord({ key: 'owner-a:expired', ownerId: 'owner-a', files: [], expiresAt: new Date(now - 1000).toISOString() });
    await putEvidenceRecord({ key: 'owner-a:fresh', ownerId: 'owner-a', files: [], expiresAt: new Date(now + 3600000).toISOString() });
    expect(await loadEvidenceDraftFiles({ ownerId: 'owner-a', draftId: 'expired' })).toBeNull();
    await putEvidenceRecord({ key: 'owner-b:expired', ownerId: 'owner-b', files: [], expiresAt: new Date(now - 1000).toISOString() });
    await deleteExpiredEvidenceDrafts();
    expect(await loadEvidenceDraftFiles({ ownerId: 'owner-b', draftId: 'expired' })).toBeNull();
    expect(await loadEvidenceDraftFiles({ ownerId: 'owner-a', draftId: 'fresh' })).toEqual([]);
  });

  it('clears all drafts for one owner while preserving other owners', async () => {
    for (const [ownerId, draftId] of [['owner-a', 'one'], ['owner-a', 'two'], ['owner-b', 'one']]) await saveEvidenceDraftFiles({ ownerId, draftId, files: [] });
    await clearOwnerEvidenceDrafts('owner-a');
    expect(await loadEvidenceDraftFiles({ ownerId: 'owner-a', draftId: 'one' })).toBeNull();
    expect(await loadEvidenceDraftFiles({ ownerId: 'owner-a', draftId: 'two' })).toBeNull();
    expect(await loadEvidenceDraftFiles({ ownerId: 'owner-b', draftId: 'one' })).toEqual([]);
  });

  it('rejects corrupt stored evidence rather than returning an unsafe shape', async () => {
    await putEvidenceRecord({ key: 'owner-a:corrupt', ownerId: 'owner-a', files: {}, expiresAt: new Date(Date.now() + 3600000).toISOString() });
    await expect(loadEvidenceDraftFiles({ ownerId: 'owner-a', draftId: 'corrupt' })).rejects.toThrow('Stored evidence is invalid');
  });

  it('surfaces database-open failures with specific and fallback messages', async () => {
    const denied = new DOMException('Storage denied', 'SecurityError');
    failOpen(denied);
    await expect(openEvidenceDraftDatabase()).rejects.toBe(denied);
    failOpen(null);
    await expect(openEvidenceDraftDatabase()).rejects.toThrow('IndexedDB is unavailable');
  });

  it('surfaces failed read requests and closes their connection', async () => {
    const close = vi.spyOn(IDBDatabase.prototype, 'close');
    const readError = new Error('Stored evidence could not be read');
    vi.spyOn(IDBObjectStore.prototype, 'get').mockImplementation(() => {
      const request = { error: readError };
      queueMicrotask(() => request.onerror());
      return request;
    });
    await expect(loadEvidenceDraftFiles({ ownerId: 'owner-a', draftId: 'draft-1' })).rejects.toBe(readError);
    expect(close).toHaveBeenCalled();
  });

  it('supplies a fallback when a failed request has no browser error object', async () => {
    vi.spyOn(IDBObjectStore.prototype, 'get').mockImplementation(() => {
      const request = { error: null };
      queueMicrotask(() => request.onerror());
      return request;
    });
    await expect(loadEvidenceDraftFiles({ ownerId: 'owner-a', draftId: 'draft-1' })).rejects.toThrow('IndexedDB request failed');
  });

  it('does not report a successful load when its real transaction is aborted after the read', async () => {
    const originalGet = IDBObjectStore.prototype.get;
    vi.spyOn(IDBObjectStore.prototype, 'get').mockImplementation(function (...args) {
      const request = originalGet.apply(this, args);
      request.addEventListener('success', () => queueMicrotask(() => request.transaction.abort()));
      return request;
    });
    await expect(loadEvidenceDraftFiles({ ownerId: 'owner-a', draftId: 'draft-1' })).rejects.toThrow('IndexedDB transaction aborted');
  });
});
