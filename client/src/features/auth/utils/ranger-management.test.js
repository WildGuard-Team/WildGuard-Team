import assert from 'node:assert/strict';
import test from 'node:test';
import { filterRangers, summarizeRangers } from './ranger-management.js';

const rangers = [
  { _id: '1', fullName: 'Asha Silva', rangerId: 'R-001', email: 'asha@example.test', assignedPark: 'Yala', approvalStatus: 'PENDING' },
  { _id: '2', fullName: 'Kamal Perera', rangerId: 'R-002', email: 'kamal@example.test', assignedPark: 'Wilpattu', approvalStatus: 'APPROVED' },
  { _id: '3', fullName: 'Nimal Dias', rangerId: 'R-003', email: 'nimal@example.test', assignedPark: 'Udawalawe', approvalStatus: 'REJECTED' },
];

test('summary counts every status and total independently of visible filtering', () => {
  assert.deepEqual(summarizeRangers(rangers), { PENDING: 1, APPROVED: 1, REJECTED: 1, total: 3 });
  assert.deepEqual(summarizeRangers([]), { PENDING: 0, APPROVED: 0, REJECTED: 0, total: 0 });
});

test('All and each status select the expected registrations', () => {
  assert.equal(filterRangers(rangers, 'ALL', '').length, 3);
  for (const status of ['PENDING', 'APPROVED', 'REJECTED']) {
    assert.deepEqual(filterRangers(rangers, status, '').map((ranger) => ranger.approvalStatus), [status]);
  }
});

test('search matches each supported field, trims input, and ignores case', () => {
  for (const query of [' ASHA ', 'r-001', 'ASHA@EXAMPLE', 'yala']) {
    assert.deepEqual(filterRangers(rangers, 'ALL', query).map((ranger) => ranger._id), ['1']);
  }
  assert.equal(filterRangers(rangers, 'APPROVED', 'asha').length, 0);
  assert.equal(filterRangers(rangers, 'ALL', 'unmatched').length, 0);
});

test('an approval update immediately changes summary and filtered lists', () => {
  const updated = rangers.map((ranger) => ranger._id === '1'
    ? { ...ranger, approvalStatus: 'APPROVED' }
    : ranger);
  assert.deepEqual(summarizeRangers(updated), { PENDING: 0, APPROVED: 2, REJECTED: 1, total: 3 });
  assert.equal(filterRangers(updated, 'PENDING', '').length, 0);
  assert.equal(filterRangers(updated, 'APPROVED', '').length, 2);
});
