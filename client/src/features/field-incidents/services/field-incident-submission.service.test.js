import assert from 'node:assert/strict';
import test from 'node:test';
import { FieldIncidentNetworkError } from './field-incident.service.js';
import { submitOrQueueFieldIncident } from './field-incident-submission.service.js';
import { formatFieldIncidentCoordinates } from '../utils/field-incident-location.js';

const draft = { clientIncidentId: 'client-incident' };
const ownerId = 'ranger-user';
const incident = { clientIncidentId: draft.clientIncidentId, referenceNumber: 'FI-test', status: 'SUBMITTED' };
const pending = { clientIncidentId: draft.clientIncidentId, createdAt: '2026-10-08T08:00:00.000Z' };

test('online submission returns the server incident without saving a pending copy', async () => {
  const result = await submitOrQueueFieldIncident({ draft, ownerId }, {
    isOnline: () => true,
    submit: async (input) => { assert.equal(input, draft); return incident; },
    savePending: () => assert.fail('Successful online submission must not be queued'),
  });
  assert.deepEqual(result, { type: 'ONLINE_SUBMITTED', incident });
});

test('known offline submission preserves owner, draft ID, and confirmation fields', async () => {
  const result = await submitOrQueueFieldIncident({ draft, ownerId }, {
    isOnline: () => false,
    submit: () => assert.fail('Offline submission must not call the API'),
    savePending: async (input) => { assert.deepEqual(input, { draft, ownerId }); return pending; },
  });
  assert.deepEqual(result, {
    type: 'OFFLINE_QUEUED',
    incident: { ...pending, referenceNumber: null, status: 'PENDING_SYNC' },
  });
});

test('unreachable API queues the same draft and clientIncidentId', async () => {
  let saved;
  const result = await submitOrQueueFieldIncident({ draft, ownerId }, {
    isOnline: () => true,
    submit: async () => { throw new FieldIncidentNetworkError('Unable to reach WildGuard.'); },
    savePending: async (input) => { saved = input; return pending; },
  });
  assert.equal(saved.draft, draft);
  assert.equal(result.type, 'OFFLINE_QUEUED');
  assert.equal(result.incident.clientIncidentId, draft.clientIncidentId);
});

test('API authorization, validation, and upload errors are not queued', async () => {
  const error = new Error('Your session has expired. Please sign in again.');
  await assert.rejects(submitOrQueueFieldIncident({ draft, ownerId }, {
    isOnline: () => true,
    submit: async () => { throw error; },
    savePending: () => assert.fail('An API response error must not be queued'),
  }), (caught) => caught === error);
});

test('offline storage failure preserves the existing user-facing message', async () => {
  const cause = new Error('Storage unavailable');
  await assert.rejects(submitOrQueueFieldIncident({ draft, ownerId }, {
    isOnline: () => false,
    savePending: async () => { throw cause; },
  }), (error) => {
    assert.equal(error.message,
      'The incident could not be saved for offline synchronization. Keep this page open and try again.');
    assert.equal(error.cause, cause);
    return true;
  });
});

test('offline submissions preserve selected map coordinates and normalize cleared coordinates', async () => {
  const coordinates = { latitude: 6.37298123456, longitude: 81.51234789123 };
  const location = {
    source: 'MANUAL', coordinates,
    manualCoordinates: formatFieldIncidentCoordinates(coordinates),
    description: 'Patrol track',
  };
  let stored;
  const dependencies = {
    isOnline: () => false,
    savePending: async (input) => { stored = input.draft; return pending; },
  };
  await submitOrQueueFieldIncident({ draft: { ...draft, location }, ownerId }, dependencies);
  assert.deepEqual(stored.location.coordinates, coordinates);
  assert.equal(stored.location.source, 'MANUAL');

  await submitOrQueueFieldIncident({
    draft: { ...draft, location: { ...location, manualCoordinates: '' } }, ownerId,
  }, dependencies);
  assert.equal(stored.location.coordinates, null);
  assert.equal(stored.location.description, 'Patrol track');
});

test('invalid coordinate objects cannot enter either online submission or the offline queue', async () => {
  for (const online of [false, true]) {
    await assert.rejects(submitOrQueueFieldIncident({
      draft: { ...draft, location: { coordinates: { latitude: 91, longitude: 80 } } },
      ownerId,
    }, {
      isOnline: () => online,
      submit: () => assert.fail('Invalid coordinates must not be submitted'),
      savePending: () => assert.fail('Invalid coordinates must not be queued'),
    }), /Enter valid GPS coordinates/);
  }
});

test('invalid manual GPS input cannot be saved in the offline queue', async () => {
  await assert.rejects(submitOrQueueFieldIncident({
    draft: {
      ...draft,
      location: { coordinates: null, manualCoordinates: '91,181', description: 'Patrol track' },
    }, ownerId,
  }, {
    isOnline: () => false,
    savePending: () => assert.fail('Invalid manual GPS input must not be queued'),
  }), /Enter valid GPS coordinates/);
});
