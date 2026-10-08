import assert from 'node:assert/strict';
import test from 'node:test';
import { createUserRepository } from './user.repository.js';

function captureRangerQuery() {
  const calls = {};
  const result = [];
  const query = {
    select(fields) {
      calls.fields = fields.split(' ').sort();
      return this;
    },
    sort(order) {
      calls.order = order;
      return result;
    },
  };
  const users = createUserRepository({
    find(criteria) {
      calls.criteria = criteria;
      return query;
    },
  });
  return { users, calls, result };
}

test('Ranger listing scopes to the Ranger role, selects safe fields, and sorts newest first', () => {
  const { users, calls, result } = captureRangerQuery();
  assert.equal(users.findRangers(), result);
  assert.deepEqual(calls.criteria, { role: 'PARK_RANGER' });
  assert.deepEqual(calls.fields, [
    'approvalStatus', 'assignedPark', 'createdAt', 'email', 'fullName', 'rangerId',
  ]);
  assert.deepEqual(calls.order, { createdAt: -1 });
});

test('legacy pending query retains its role and status restrictions', () => {
  const { users, calls, result } = captureRangerQuery();
  assert.equal(users.findPendingRangers(), result);
  assert.deepEqual(calls.criteria, {
    role: 'PARK_RANGER', approvalStatus: 'PENDING',
  });
  assert.deepEqual(calls.fields, [
    'approvalStatus', 'assignedPark', 'createdAt', 'email', 'fullName', 'rangerId',
  ]);
  assert.deepEqual(calls.order, { createdAt: -1 });
});
