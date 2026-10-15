import assert from 'node:assert/strict';
import test from 'node:test';
import { listRangers } from './list-rangers.service.js';

test('listing returns every Ranger status and explicitly excludes repository security fields', async () => {
  const records = ['PENDING', 'APPROVED', 'REJECTED'].map((approvalStatus, index) => ({
    _id: `ranger-${index}`,
    fullName: `Ranger ${index}`,
    email: `ranger-${index}@example.test`,
    rangerId: `RG-${index}`,
    assignedPark: 'Yala National Park',
    approvalStatus,
    createdAt: new Date('2026-10-08T05:00:00.000Z'),
    passwordHash: 'private-hash',
    token: 'private-token',
    role: 'PARK_RANGER',
    security: { recoveryCode: 'private-code' },
    __v: 2,
  }));
  const rangers = await listRangers({ findRangers: async () => records });

  assert.deepEqual(rangers.map((ranger) => ranger.approvalStatus), [
    'PENDING', 'APPROVED', 'REJECTED',
  ]);
  for (const [index, ranger] of rangers.entries()) {
    assert.deepEqual(Object.keys(ranger).sort(), [
      '_id', 'approvalStatus', 'assignedPark', 'createdAt', 'email', 'fullName', 'rangerId',
    ]);
    assert.equal(ranger._id, records[index]._id);
    assert.equal(ranger.createdAt, records[index].createdAt);
  }
});

test('an empty repository list returns an empty Ranger list', async () => {
  assert.deepEqual(await listRangers({ findRangers: async () => [] }), []);
});
