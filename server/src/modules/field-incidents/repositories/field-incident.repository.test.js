import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createFieldIncidentRepository,
} from './field-incident.repository.js';

test(
  'create initializes model and creates incident',
  async () => {
    const calls = {
      init: 0,
      create: [],
    };

    const expectedIncident = {
      id: 'incident-001',
    };

    const model = {
      async init() {
        calls.init += 1;
      },

      async create(input) {
        calls.create.push(input);

        return expectedIncident;
      },
    };

    const repository =
      createFieldIncidentRepository(
        model,
      );

    const input = {
      incidentType: 'POACHING',
    };

    const result =
      await repository.create(
        input,
      );

    assert.equal(
      calls.init,
      1,
    );

    assert.deepEqual(
      calls.create,
      [
        input,
      ],
    );

    assert.equal(
      result,
      expectedIncident,
    );
  },
);

test(
  'findByRanger filters by ranger and sorts newest first',
  () => {
    const calls = {
      find: [],
      sort: [],
    };

    const expectedResult = [
      {
        id: 'incident-002',
      },
    ];

    const model = {
      find(filter) {
        calls.find.push(
          filter,
        );

        return {
          sort(sortValue) {
            calls.sort.push(
              sortValue,
            );

            return expectedResult;
          },
        };
      },
    };

    const repository =
      createFieldIncidentRepository(
        model,
      );

    const result =
      repository.findByRanger(
        'ranger-user-001',
      );

    assert.deepEqual(
      calls.find,
      [
        {
          rangerUserId:
            'ranger-user-001',
        },
      ],
    );

    assert.deepEqual(
      calls.sort,
      [
        {
          createdAt:
            -1,
        },
      ],
    );

    assert.equal(
      result,
      expectedResult,
    );
  },
);

test(
  'findByReferenceNumber finds incident using reference number',
  () => {
    const calls = [];

    const expectedIncident = {
      id: 'incident-003',
    };

    const model = {
      findOne(filter) {
        calls.push(
          filter,
        );

        return expectedIncident;
      },
    };

    const repository =
      createFieldIncidentRepository(
        model,
      );

    const result =
      repository.findByReferenceNumber(
        'FI-20261008-ABC123',
      );

    assert.deepEqual(
      calls,
      [
        {
          referenceNumber:
            'FI-20261008-ABC123',
        },
      ],
    );

    assert.equal(
      result,
      expectedIncident,
    );
  },
);

test(
  'findByClientIncidentId finds incident for the same Ranger and client ID',
  () => {
    const calls = [];

    const expectedIncident = {
      id: 'incident-004',
    };

    const model = {
      findOne(filter) {
        calls.push(
          filter,
        );

        return expectedIncident;
      },
    };

    const repository =
      createFieldIncidentRepository(
        model,
      );

    const result =
      repository.findByClientIncidentId(
        'ranger-user-001',
        'client-incident-001',
      );

    assert.deepEqual(
      calls,
      [
        {
          rangerUserId:
            'ranger-user-001',

          clientIncidentId:
            'client-incident-001',
        },
      ],
    );

    assert.equal(
      result,
      expectedIncident,
    );
  },
);