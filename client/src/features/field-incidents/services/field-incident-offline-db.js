const DATABASE_NAME =
  'wildguard-field-incidents';

const DATABASE_VERSION = 1;

const STORE_NAME =
  'pending-field-incidents';

function openDatabase() {
  return new Promise(
    (resolve, reject) => {
      if (
        typeof indexedDB === 'undefined'
      ) {
        reject(
          new Error(
            'Offline storage is not supported by this browser.',
          ),
        );

        return;
      }

      const request =
        indexedDB.open(
          DATABASE_NAME,
          DATABASE_VERSION,
        );

      request.onupgradeneeded = () => {
        const database =
          request.result;

        if (
          !database.objectStoreNames.contains(
            STORE_NAME,
          )
        ) {
          const store =
            database.createObjectStore(
              STORE_NAME,
              {
                keyPath:
                  'clientIncidentId',
              },
            );

          store.createIndex(
            'ownerId',
            'ownerId',
            {
              unique: false,
            },
          );

          store.createIndex(
            'status',
            'status',
            {
              unique: false,
            },
          );
        }
      };

      request.onsuccess = () => {
        resolve(
          request.result,
        );
      };

      request.onerror = () => {
        reject(
          request.error
          ?? new Error(
            'Unable to open offline incident storage.',
          ),
        );
      };
    },
  );
}

function waitForTransaction(
  transaction,
) {
  return new Promise(
    (resolve, reject) => {
      transaction.oncomplete =
        () => resolve();

      transaction.onerror =
        () => reject(
          transaction.error
          ?? new Error(
            'Offline storage operation failed.',
          ),
        );

      transaction.onabort =
        () => reject(
          transaction.error
          ?? new Error(
            'Offline storage operation was cancelled.',
          ),
        );
    },
  );
}

export async function savePendingFieldIncident({
  ownerId,
  draft,
}) {
  if (!ownerId) {
    throw new Error(
      'A Ranger account is required to save an offline incident.',
    );
  }

  if (
    !draft?.clientIncidentId
  ) {
    throw new Error(
      'The incident does not have a client incident ID.',
    );
  }

  const database =
    await openDatabase();

  try {
    const transaction =
      database.transaction(
        STORE_NAME,
        'readwrite',
      );

    const store =
      transaction.objectStore(
        STORE_NAME,
      );

    const now =
      new Date().toISOString();

    store.put({
      clientIncidentId:
        draft.clientIncidentId,

      ownerId,

      status:
        'PENDING_SYNC',

      createdAt:
        now,

      updatedAt:
        now,

      lastAttemptAt:
        null,

      lastError:
        null,

      syncAttempts:
        0,

      /*
       * IndexedDB supports structured cloning,
       * including File/Blob objects.
       */
      draft: {
        ...draft,

        location: {
          ...draft.location,
        },

        evidence: [
          ...(draft.evidence ?? []),
        ],
      },
    });

    await waitForTransaction(
      transaction,
    );

    return {
      clientIncidentId:
        draft.clientIncidentId,

      status:
        'PENDING_SYNC',

      createdAt:
        now,
    };
  } finally {
    database.close();
  }
}

export async function getPendingFieldIncidents(
  ownerId,
) {
  if (!ownerId) {
    return [];
  }

  const database =
    await openDatabase();

  try {
    return await new Promise(
      (resolve, reject) => {
        const transaction =
          database.transaction(
            STORE_NAME,
            'readonly',
          );

        const store =
          transaction.objectStore(
            STORE_NAME,
          );

        const index =
          store.index(
            'ownerId',
          );

        const request =
          index.getAll(
            ownerId,
          );

        request.onsuccess = () => {
          const incidents =
            request.result ?? [];

          resolve(
            incidents
              .filter(
                (incident) =>
                  incident.status
                  === 'PENDING_SYNC',
              )
              .sort(
                (a, b) =>
                  new Date(
                    a.createdAt,
                  ).getTime()
                  - new Date(
                    b.createdAt,
                  ).getTime(),
              ),
          );
        };

        request.onerror = () => {
          reject(
            request.error
            ?? new Error(
              'Unable to load pending incidents.',
            ),
          );
        };
      },
    );
  } finally {
    database.close();
  }
}

export async function getPendingFieldIncident(
  clientIncidentId,
) {
  if (!clientIncidentId) {
    return null;
  }

  const database =
    await openDatabase();

  try {
    return await new Promise(
      (resolve, reject) => {
        const transaction =
          database.transaction(
            STORE_NAME,
            'readonly',
          );

        const store =
          transaction.objectStore(
            STORE_NAME,
          );

        const request =
          store.get(
            clientIncidentId,
          );

        request.onsuccess =
          () =>
            resolve(
              request.result
              ?? null,
            );

        request.onerror =
          () =>
            reject(
              request.error
              ?? new Error(
                'Unable to load the pending incident.',
              ),
            );
      },
    );
  } finally {
    database.close();
  }
}

export async function markPendingFieldIncidentAttempt(
  clientIncidentId,
  errorMessage = '',
) {
  const database =
    await openDatabase();

  try {
    const existing =
      await new Promise(
        (resolve, reject) => {
          const transaction =
            database.transaction(
              STORE_NAME,
              'readonly',
            );

          const store =
            transaction.objectStore(
              STORE_NAME,
            );

          const request =
            store.get(
              clientIncidentId,
            );

          request.onsuccess =
            () =>
              resolve(
                request.result
                ?? null,
              );

          request.onerror =
            () =>
              reject(
                request.error,
              );
        },
      );

    if (!existing) {
      return;
    }

    const transaction =
      database.transaction(
        STORE_NAME,
        'readwrite',
      );

    transaction
      .objectStore(
        STORE_NAME,
      )
      .put({
        ...existing,

        status:
          'PENDING_SYNC',

        updatedAt:
          new Date()
            .toISOString(),

        lastAttemptAt:
          new Date()
            .toISOString(),

        lastError:
          errorMessage
          || null,

        syncAttempts:
          (
            existing.syncAttempts
            ?? 0
          ) + 1,
      });

    await waitForTransaction(
      transaction,
    );
  } finally {
    database.close();
  }
}

export async function deletePendingFieldIncident(
  clientIncidentId,
) {
  if (!clientIncidentId) {
    return;
  }

  const database =
    await openDatabase();

  try {
    const transaction =
      database.transaction(
        STORE_NAME,
        'readwrite',
      );

    transaction
      .objectStore(
        STORE_NAME,
      )
      .delete(
        clientIncidentId,
      );

    await waitForTransaction(
      transaction,
    );
  } finally {
    database.close();
  }
}

export async function clearPendingFieldIncidentsForOwner(
  ownerId,
) {
  if (!ownerId) {
    return;
  }

  const incidents =
    await getPendingFieldIncidents(
      ownerId,
    );

  for (
    const incident
    of incidents
  ) {
    await deletePendingFieldIncident(
      incident.clientIncidentId,
    );
  }
}