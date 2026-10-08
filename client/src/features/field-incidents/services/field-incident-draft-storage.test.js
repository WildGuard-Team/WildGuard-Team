import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmptyDraft } from '../utils/field-incident-draft.js';
import { clearStoredDraft, loadDraft, saveDraft } from './field-incident-draft-storage.js';

function installStorage(t, storage) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'sessionStorage', original);
    else delete globalThis.sessionStorage;
  });
}

function useStorage(t) {
  const values = new Map();
  installStorage(t, {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  });
  return values;
}

test('draft reload retains its ID and fields without serializing evidence Files', (t) => {
  const values = useStorage(t);
  const draft = createEmptyDraft();
  draft.description = 'Test field incident';
  draft.evidence = [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })];
  saveDraft(draft);
  const stored = JSON.parse(values.get('wildguard.fieldIncidentDraft.v1'));
  assert.equal(Object.hasOwn(stored, 'evidence'), false);
  const restored = loadDraft();
  assert.equal(restored.clientIncidentId, draft.clientIncidentId);
  assert.equal(restored.description, draft.description);
  assert.deepEqual(restored.evidence, []);
});

test('legacy drafts gain an ID that persists across further reloads', (t) => {
  const values = useStorage(t);
  values.set('wildguard.fieldIncidentDraft.v1', JSON.stringify({ incidentType: 'OTHER' }));
  const restored = loadDraft();
  assert.ok(restored.clientIncidentId);
  assert.equal(restored.incidentType, 'OTHER');
  saveDraft(restored);
  assert.equal(loadDraft().clientIncidentId, restored.clientIncidentId);
});

test('loading an old GPS draft reconciles edited manual text before direct review', (t) => {
  useStorage(t);
  const draft = createEmptyDraft();
  draft.location = {
    source: 'GPS',
    coordinates: { latitude: 7.123456789, longitude: 80.987654321 },
    manualCoordinates: '8.25, 81.75',
    description: 'Patrol area',
  };
  saveDraft(draft);
  const restored = loadDraft();
  assert.equal(restored.clientIncidentId, draft.clientIncidentId);
  assert.equal(restored.location.source, 'MANUAL');
  assert.deepEqual(restored.location.coordinates, { latitude: 8.25, longitude: 81.75 });
});

test('clearing persisted draft removes the original storage key', (t) => {
  const values = useStorage(t);
  saveDraft(createEmptyDraft());
  clearStoredDraft();
  assert.equal(values.has('wildguard.fieldIncidentDraft.v1'), false);
});

test('unavailable browser storage preserves an in-memory draft fallback', (t) => {
  installStorage(t, {
    getItem() { throw new Error('Unavailable'); },
    setItem() { throw new Error('Unavailable'); },
    removeItem() { throw new Error('Unavailable'); },
  });
  assert.ok(loadDraft().clientIncidentId);
  assert.doesNotThrow(() => saveDraft(createEmptyDraft()));
  assert.doesNotThrow(clearStoredDraft);
});
