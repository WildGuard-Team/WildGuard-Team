import test from 'node:test';
import assert from 'node:assert/strict';

import {
  requireParkRanger,
} from './require-park-ranger.middleware.js';

function createResponse() {
  return {};
}

function createNextRecorder() {
  const calls = [];

  return {
    calls,

    next(error) {
      calls.push(error);
    },
  };
}

function createValidObjectId() {
  return '507f1f77bcf86cd799439011';
}

test(
  'allows an approved Park Ranger',
  async () => {
    const ranger = {
      id:
        createValidObjectId(),

      role:
        'PARK_RANGER',

      approvalStatus:
        'APPROVED',
    };

    const users = {
      async findById(id) {
        assert.equal(
          id,
          createValidObjectId(),
        );

        return ranger;
      },
    };

    const req = {
      auth: {
        userId:
          createValidObjectId(),

        role:
          'PARK_RANGER',
      },
    };

    const recorder =
      createNextRecorder();

    const middleware =
      requireParkRanger(
        users,
      );

    await middleware(
      req,
      createResponse(),
      recorder.next,
    );

    assert.equal(
      recorder.calls.length,
      1,
    );

    assert.equal(
      recorder.calls[0],
      undefined,
    );

    assert.equal(
      req.parkRanger,
      ranger,
    );
  },
);

test(
  'rejects invalid authenticated user ID',
  async () => {
    const users = {
      async findById() {
        throw new Error(
          'findById should not be called',
        );
      },
    };

    const req = {
      auth: {
        userId:
          'invalid-id',

        role:
          'PARK_RANGER',
      },
    };

    const recorder =
      createNextRecorder();

    const middleware =
      requireParkRanger(
        users,
      );

    await middleware(
      req,
      createResponse(),
      recorder.next,
    );

    assert.equal(
      recorder.calls.length,
      1,
    );

    assert.equal(
      recorder.calls[0].status,
      401,
    );

    assert.equal(
      recorder.calls[0].message,
      'Authentication required.',
    );
  },
);

test(
  'rejects user that no longer exists',
  async () => {
    const users = {
      async findById() {
        return null;
      },
    };

    const req = {
      auth: {
        userId:
          createValidObjectId(),

        role:
          'PARK_RANGER',
      },
    };

    const recorder =
      createNextRecorder();

    const middleware =
      requireParkRanger(
        users,
      );

    await middleware(
      req,
      createResponse(),
      recorder.next,
    );

    assert.equal(
      recorder.calls[0].status,
      401,
    );

    assert.equal(
      recorder.calls[0].message,
      'Authentication required.',
    );
  },
);

test(
  'rejects Community Member',
  async () => {
    const users = {
      async findById() {
        return {
          id:
            createValidObjectId(),

          role:
            'COMMUNITY_MEMBER',

          approvalStatus:
            'APPROVED',
        };
      },
    };

    const req = {
      auth: {
        userId:
          createValidObjectId(),

        role:
          'COMMUNITY_MEMBER',
      },
    };

    const recorder =
      createNextRecorder();

    await requireParkRanger(
      users,
    )(
      req,
      createResponse(),
      recorder.next,
    );

    assert.equal(
      recorder.calls[0].status,
      403,
    );

    assert.equal(
      recorder.calls[0].message,
      'Only Park Rangers can report field incidents.',
    );
  },
);

test(
  'rejects Park Manager',
  async () => {
    const users = {
      async findById() {
        return {
          id:
            createValidObjectId(),

          role:
            'PARK_MANAGER',

          approvalStatus:
            'APPROVED',
        };
      },
    };

    const req = {
      auth: {
        userId:
          createValidObjectId(),

        role:
          'PARK_MANAGER',
      },
    };

    const recorder =
      createNextRecorder();

    await requireParkRanger(
      users,
    )(
      req,
      createResponse(),
      recorder.next,
    );

    assert.equal(
      recorder.calls[0].status,
      403,
    );

    assert.equal(
      recorder.calls[0].message,
      'Only Park Rangers can report field incidents.',
    );
  },
);

test(
  'rejects Ranger with pending approval',
  async () => {
    const users = {
      async findById() {
        return {
          id:
            createValidObjectId(),

          role:
            'PARK_RANGER',

          approvalStatus:
            'PENDING',
        };
      },
    };

    const req = {
      auth: {
        userId:
          createValidObjectId(),

        role:
          'PARK_RANGER',
      },
    };

    const recorder =
      createNextRecorder();

    await requireParkRanger(
      users,
    )(
      req,
      createResponse(),
      recorder.next,
    );

    assert.equal(
      recorder.calls[0].status,
      403,
    );

    assert.equal(
      recorder.calls[0].message,
      'Your Ranger account is not approved.',
    );
  },
);

test(
  'rejects Ranger with rejected approval',
  async () => {
    const users = {
      async findById() {
        return {
          id:
            createValidObjectId(),

          role:
            'PARK_RANGER',

          approvalStatus:
            'REJECTED',
        };
      },
    };

    const req = {
      auth: {
        userId:
          createValidObjectId(),

        role:
          'PARK_RANGER',
      },
    };

    const recorder =
      createNextRecorder();

    await requireParkRanger(
      users,
    )(
      req,
      createResponse(),
      recorder.next,
    );

    assert.equal(
      recorder.calls[0].status,
      403,
    );

    assert.equal(
      recorder.calls[0].message,
      'Your Ranger account is not approved.',
    );
  },
);

test(
  'rejects when token role and database role do not match',
  async () => {
    const users = {
      async findById() {
        return {
          id:
            createValidObjectId(),

          role:
            'COMMUNITY_MEMBER',

          approvalStatus:
            'APPROVED',
        };
      },
    };

    const req = {
      auth: {
        userId:
          createValidObjectId(),

        role:
          'PARK_RANGER',
      },
    };

    const recorder =
      createNextRecorder();

    await requireParkRanger(
      users,
    )(
      req,
      createResponse(),
      recorder.next,
    );

    assert.equal(
      recorder.calls[0].status,
      403,
    );

    assert.equal(
      recorder.calls[0].message,
      'Only Park Rangers can report field incidents.',
    );
  },
);

test(
  'passes repository errors to next',
  async () => {
    const databaseError =
      new Error(
        'Database unavailable',
      );

    const users = {
      async findById() {
        throw databaseError;
      },
    };

    const req = {
      auth: {
        userId:
          createValidObjectId(),

        role:
          'PARK_RANGER',
      },
    };

    const recorder =
      createNextRecorder();

    await requireParkRanger(
      users,
    )(
      req,
      createResponse(),
      recorder.next,
    );

    assert.equal(
      recorder.calls[0],
      databaseError,
    );
  },
);