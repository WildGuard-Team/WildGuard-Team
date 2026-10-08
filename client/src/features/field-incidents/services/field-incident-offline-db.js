import { FIELD_INCIDENT_PENDING_SYNC } from '../config/field-incident.constants.js';

const DATABASE_NAME = 'wildguard-field-incidents';
const DATABASE_VERSION = 1;
const STORE_NAME = 'pending-field-incidents';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Offline storage is not supported by this browser.'));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'clientIncidentId' });
        store.createIndex('ownerId', 'ownerId', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open offline incident storage.'));
  });
}

function requestToPromise(request, errorMessage) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error(errorMessage));
  });
}

function waitForTransaction(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Offline storage operation failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Offline storage operation was cancelled.'));
  });
}

async function withDatabase(operation) {
  const database = await openDatabase();
  try {
    return await operation(database);
  } finally {
    database.close();
  }
}

function readIncident(database, clientIncidentId, errorMessage) {
  const store = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
  return requestToPromise(store.get(clientIncidentId), errorMessage);
}

export async function savePendingFieldIncident({ ownerId, draft }) {
  if (!ownerId) throw new Error('A Ranger account is required to save an offline incident.');
  if (!draft?.clientIncidentId) throw new Error('The incident does not have a client incident ID.');

  return withDatabase(async (database) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const completed = waitForTransaction(transaction);
    const now = new Date().toISOString();
    transaction.objectStore(STORE_NAME).put({
      clientIncidentId: draft.clientIncidentId,
      ownerId,
      status: FIELD_INCIDENT_PENDING_SYNC,
      createdAt: now,
      updatedAt: now,
      lastAttemptAt: null,
      lastError: null,
      syncAttempts: 0,
      // IndexedDB structured cloning preserves evidence File/Blob objects.
      draft: { ...draft, location: { ...draft.location }, evidence: [...(draft.evidence ?? [])] },
    });
    await completed;
    return { clientIncidentId: draft.clientIncidentId, status: FIELD_INCIDENT_PENDING_SYNC, createdAt: now };
  });
}

export async function getPendingFieldIncidents(ownerId) {
  if (!ownerId) return [];
  return withDatabase(async (database) => {
    const store = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
    const incidents = await requestToPromise(store.index('ownerId').getAll(ownerId), 'Unable to load pending incidents.');
    return (incidents ?? [])
      .filter((incident) => incident.status === FIELD_INCIDENT_PENDING_SYNC)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  });
}

export async function getPendingFieldIncident(clientIncidentId) {
  if (!clientIncidentId) return null;
  return withDatabase(async (database) => (
    await readIncident(database, clientIncidentId, 'Unable to load the pending incident.') ?? null
  ));
}

export async function markPendingFieldIncidentAttempt(clientIncidentId, errorMessage = '') {
  return withDatabase(async (database) => {
    const existing = await readIncident(database, clientIncidentId, 'Unable to load the pending incident.');
    if (!existing) return;
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const completed = waitForTransaction(transaction);
    const now = new Date().toISOString();
    transaction.objectStore(STORE_NAME).put({
      ...existing,
      status: FIELD_INCIDENT_PENDING_SYNC,
      updatedAt: now,
      lastAttemptAt: now,
      lastError: errorMessage || null,
      syncAttempts: (existing.syncAttempts ?? 0) + 1,
    });
    await completed;
  });
}

export async function deletePendingFieldIncident(clientIncidentId) {
  if (!clientIncidentId) return;
  return withDatabase(async (database) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const completed = waitForTransaction(transaction);
    transaction.objectStore(STORE_NAME).delete(clientIncidentId);
    await completed;
  });
}

export async function clearPendingFieldIncidentsForOwner(ownerId) {
  if (!ownerId) return;
  const incidents = await getPendingFieldIncidents(ownerId);
  for (const incident of incidents) await deletePendingFieldIncident(incident.clientIncidentId);
}
