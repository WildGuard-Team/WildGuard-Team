const databaseName = 'wildguard-pending-reports';
const storeName = 'reports';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(storeName, { keyPath: ['ownerId', 'clientSubmissionId'] });
      store.createIndex('ownerId', 'ownerId');
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other WildGuard tabs and try saving again.'));
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}

async function transact(ownerId, mode, work) {
  if (!ownerId) throw new Error('Sign in to access reports saved on this device.');
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, mode);
      let result;
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = transaction.onerror = () => reject(transaction.error ?? new Error('Unable to save reports on this device.'));
      work(transaction.objectStore(storeName), (value) => { result = value; });
    });
  } finally { database.close(); }
}

export function savePendingReport(ownerId, report) {
  if (typeof report.clientSubmissionId !== 'string' || !report.clientSubmissionId.trim()) {
    return Promise.reject(new Error('A submission id is required to save this report.'));
  }
  const record = {
    ownerId, clientSubmissionId: report.clientSubmissionId,
    reportType: report.reportType, description: report.description,
    incidentDateTime: report.incidentDateTime, location: report.location,
    status: 'offline_pending', savedAt: new Date().toISOString(),
    evidence: report.evidence.map((file) => ({
      blob: file, name: file.name, type: file.type, lastModified: file.lastModified,
    })),
  };
  return transact(ownerId, 'readwrite', (store, done) => {
    const existing = store.get([ownerId, record.clientSubmissionId]);
    existing.onsuccess = () => {
      record.savedAt = existing.result?.savedAt ?? record.savedAt;
      store.put(record).onsuccess = () => done(record);
    };
  });
}

export function getPendingReports(ownerId) {
  return transact(ownerId, 'readonly', (store, done) => {
    store.index('ownerId').getAll(ownerId).onsuccess = (event) => {
      done(event.target.result.filter((report) => report.status === 'offline_pending'));
    };
  });
}

export function getPendingReport(ownerId, clientSubmissionId) {
  return transact(ownerId, 'readonly', (store, done) => {
    store.get([ownerId, clientSubmissionId]).onsuccess = (event) => done(event.target.result);
  });
}

export function deletePendingReport(ownerId, clientSubmissionId) {
  return transact(ownerId, 'readwrite', (store) => { store.delete([ownerId, clientSubmissionId]); });
}

export function restorePendingSubmission(record) {
  return {
    clientSubmissionId: record.clientSubmissionId, reportType: record.reportType,
    description: record.description, incidentDateTime: record.incidentDateTime, location: record.location,
    evidence: record.evidence.map(({ blob, name, type, lastModified }) => new File([blob], name, { type, lastModified })),
  };
}
