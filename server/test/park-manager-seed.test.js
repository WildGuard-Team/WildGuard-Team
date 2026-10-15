import assert from 'node:assert/strict';
import test from 'node:test';
import { PARK_MANAGER } from '../src/modules/auth/config/auth.constants.js';
import { seedParkManager } from '../src/modules/auth/services/seed-park-manager.service.js';

const account = {
  fullName: 'WildGuard Park Manager',
  email: ' ParkManager@WildGuard.lk ',
  password: 'Manager@123',
};

test('Park Manager seed creates a normalized manager with a hashed password', async () => {
  let created;
  const repository = {
    findByEmail: async () => null,
    create: async (value) => { created = { id: 'manager-1', ...value }; return created; },
  };
  const passwordService = {
    hash: async (value) => `hashed:${value}`,
    verify: async () => false,
  };

  const result = await seedParkManager(repository, account, passwordService);

  assert.equal(result.action, 'created');
  assert.deepEqual(created, {
    id: 'manager-1',
    fullName: 'WildGuard Park Manager',
    email: 'parkmanager@wildguard.lk',
    passwordHash: 'hashed:Manager@123',
    role: PARK_MANAGER,
  });
});

test('Park Manager seed repairs role and password for an existing account', async () => {
  let update;
  const repository = {
    findByEmail: async () => ({
      id: 'manager-1', fullName: 'Old Name', role: 'COMMUNITY_MEMBER', passwordHash: 'old-hash',
    }),
    updateById: async (id, changes) => { update = { id, changes }; },
  };
  const passwordService = {
    hash: async () => 'new-hash',
    verify: async () => false,
  };

  const result = await seedParkManager(repository, account, passwordService);

  assert.equal(result.action, 'updated');
  assert.deepEqual(update, {
    id: 'manager-1',
    changes: {
      fullName: 'WildGuard Park Manager', role: PARK_MANAGER, passwordHash: 'new-hash',
    },
  });
});

test('Park Manager seed leaves a matching account unchanged', async () => {
  const repository = {
    findByEmail: async () => ({
      id: 'manager-1', fullName: 'WildGuard Park Manager', role: PARK_MANAGER, passwordHash: 'current-hash',
    }),
    updateById: async () => assert.fail('Matching accounts must not be updated.'),
  };
  const passwordService = {
    hash: async () => assert.fail('Matching passwords must not be rehashed.'),
    verify: async () => true,
  };

  const result = await seedParkManager(repository, account, passwordService);

  assert.equal(result.action, 'unchanged');
});
