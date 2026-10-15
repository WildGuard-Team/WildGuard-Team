import assert from 'node:assert/strict';
import test from 'node:test';
import { FieldIncidentNetworkError } from './field-incident.service.js';
import { submitOrQueueFieldIncident } from './field-incident-submission.service.js';

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
