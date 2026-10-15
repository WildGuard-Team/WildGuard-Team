import assert from 'node:assert/strict';
import test from 'node:test';
import { syncPendingFieldIncidents } from './field-incident-sync.service.js';

test('cancelled Ranger synchronization exits before reading IndexedDB or submitting another request', async (context) => {
  let storageOpened = false;
  const previousIndexedDB = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');
  Object.defineProperty(globalThis, 'indexedDB', {
    configurable: true,
    value: { open() { storageOpened = true; assert.fail('A cancelled owner must not open offline storage'); } },
  });
  context.mock.method(globalThis, 'fetch', () => assert.fail('A cancelled owner must not submit an incident'));

  try {
    const result = await syncPendingFieldIncidents('ranger-a', { shouldContinue: () => false });
    assert.deepEqual(result, { synced: 0, failed: 0, syncedIncidents: [] });
    assert.equal(storageOpened, false);
  } finally {
    if (previousIndexedDB) Object.defineProperty(globalThis, 'indexedDB', previousIndexedDB);
    else delete globalThis.indexedDB;
  }
});

test('synchronization without an owner retains its existing empty result', async () => {
  assert.deepEqual(await syncPendingFieldIncidents(), { synced: 0, failed: 0, syncedIncidents: [] });
});
