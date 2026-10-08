import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createFieldIncident,
} from './create-field-incident.service.js';

function createInput(
  overrides = {},
) {
  return {
    clientIncidentId:
      'client-incident-001',

    incidentType:
      'POACHING',

    incidentDateTime:
      new Date(
        '2026-10-08T10:30:00.000Z',
      ),

    riskLevel:
      'HIGH',

    parkZone:
      'Yala National Park',

    blockArea:
      'Block 1',

    location: {
      source:
        'GPS',

      coordinates: {
        latitude:
          6.933144,

        longitude:
          79.844487,
      },

      description:
        'Near the eastern patrol trail',
    },

    description:
      'Wire snare discovered near the patrol trail.',

    additionalNotes:
      'Inspect the surrounding area.',

    ...overrides,
  };
}

function createRanger() {
  return {
    id:
      'ranger-user-001',

    rangerId:
      'DWC-RG-00127',

    assignedPark:
      'Wilpattu National Park',
  };
}

function createStoredIncident(
  overrides = {},
) {
  return {
    id:
      'incident-database-id',

    referenceNumber:
      'FI-20261008-ABC123',

    clientIncidentId:
      'client-incident-001',

    rangerUserId:
      'ranger-user-001',

    rangerIdSnapshot:
      'DWC-RG-00127',

    assignedParkSnapshot:
      'Wilpattu National Park',

    incidentType:
      'POACHING',

    incidentDateTime:
      new Date(
        '2026-10-08T10:30:00.000Z',
      ),

    riskLevel:
      'HIGH',

    parkZone:
      'Yala National Park',

    blockArea:
      'Block 1',

    location: {
      source:
        'GPS',

      point: {
        type:
          'Point',

        coordinates: [
          79.844487,
          6.933144,
        ],
      },

      description:
        'Near the eastern patrol trail',
    },

    description:
      'Wire snare discovered near the patrol trail.',

    additionalNotes:
      'Inspect the surrounding area.',

    evidence: [],

    status:
      'SUBMITTED',

    createdAt:
      new Date(
        '2026-10-08T10:31:00.000Z',
      ),

    ...overrides,
  };
}

function createRepository({
  existing = null,
  createImplementation,
} = {}) {
  const calls = {
    create: [],
    findByClientIncidentId: [],
  };

  return {
    calls,

    repository: {
      async findByClientIncidentId(
        rangerUserId,
        clientIncidentId,
      ) {
        calls
          .findByClientIncidentId
          .push({
            rangerUserId,
            clientIncidentId,
          });

        return existing;
      },

      async create(
        incident,
      ) {
        calls.create.push(
          incident,
        );

        if (
          createImplementation
        ) {
          return createImplementation(
            incident,
            calls.create.length,
          );
        }

        const storedIncident =
          createStoredIncident({
            ...incident,

            id:
              'incident-database-id',

            createdAt:
              new Date(
                '2026-10-08T10:31:00.000Z',
              ),
          });

        /*
         * Accurately simulate MongoDB:
         * if clientIncidentId was not supplied
         * in the create payload, it should not
         * magically appear in the returned
         * document.
         */
        if (
          !Object.hasOwn(
            incident,
            'clientIncidentId',
          )
        ) {
          delete storedIncident.clientIncidentId;
        }

        return storedIncident;
      },
    },
  };
}

test(
  'creates and returns a field incident',
  async () => {
    const {
      repository,
      calls,
    } = createRepository();

    const result =
      await createFieldIncident(
        createInput(),
        createRanger(),
        repository,
        [],
        null,
        'test',
      );

    assert.equal(
      calls.create.length,
      1,
    );

    const saved =
      calls.create[0];

    assert.equal(
      saved.clientIncidentId,
      'client-incident-001',
    );

    assert.equal(
      saved.rangerUserId,
      'ranger-user-001',
    );

    assert.equal(
      saved.rangerIdSnapshot,
      'DWC-RG-00127',
    );

    assert.equal(
      saved.assignedParkSnapshot,
      'Wilpattu National Park',
    );

    assert.equal(
      saved.incidentType,
      'POACHING',
    );

    assert.deepEqual(
      saved.location.point,
      {
        type:
          'Point',

        coordinates: [
          79.844487,
          6.933144,
        ],
      },
    );

    assert.equal(
      saved.status,
      'SUBMITTED',
    );

    assert.equal(
      result.clientIncidentId,
      'client-incident-001',
    );

    assert.equal(
      result.referenceNumber
        .startsWith(
          'FI-',
        ),
      true,
    );

    assert.deepEqual(
      result.location.coordinates,
      {
        latitude:
          6.933144,

        longitude:
          79.844487,
      },
    );
  },
);

test(
  'returns existing incident when clientIncidentId was already submitted',
  async () => {
    const existing =
      createStoredIncident({
        referenceNumber:
          'FI-EXISTING-001',
      });

    const {
      repository,
      calls,
    } = createRepository({
      existing,
    });

    const result =
      await createFieldIncident(
        createInput(),
        createRanger(),
        repository,
        [],
        null,
        'test',
      );

    assert.equal(
      calls.findByClientIncidentId.length,
      1,
    );

    assert.equal(
      calls.create.length,
      0,
    );

    assert.equal(
      result.referenceNumber,
      'FI-EXISTING-001',
    );

    assert.equal(
      result.clientIncidentId,
      'client-incident-001',
    );
  },
);

test(
  'does not perform idempotency lookup when clientIncidentId is absent',
  async () => {
    const {
      repository,
      calls,
    } = createRepository();

    const input =
      createInput({
        clientIncidentId:
          undefined,
      });

    const result =
      await createFieldIncident(
        input,
        createRanger(),
        repository,
        [],
        null,
        'test',
      );

    assert.equal(
      calls.findByClientIncidentId.length,
      0,
    );

    assert.equal(
      calls.create.length,
      1,
    );

    assert.equal(
      Object.hasOwn(
        calls.create[0],
        'clientIncidentId',
      ),
      false,
    );

    assert.equal(
      result.clientIncidentId,
      null,
    );
  },
);

test(
  'retries when generated reference number collides',
  async () => {
    const {
      repository,
      calls,
    } = createRepository({
      createImplementation(
        incident,
        attempt,
      ) {
        if (
          attempt === 1
        ) {
          const error =
            new Error(
              'Duplicate reference number',
            );

          error.code =
            11000;

          error.keyPattern = {
            referenceNumber:
              1,
          };

          throw error;
        }

        return createStoredIncident({
          ...incident,

          referenceNumber:
            'FI-RETRY-SUCCESS',

          id:
            'retry-incident-id',

          createdAt:
            new Date(),
        });
      },
    });

    const result =
      await createFieldIncident(
        createInput(),
        createRanger(),
        repository,
        [],
        null,
        'test',
      );

    assert.equal(
      calls.create.length,
      2,
    );

    assert.equal(
      result.referenceNumber,
      'FI-RETRY-SUCCESS',
    );
  },
);

test(
  'fails after all reference number retry attempts are exhausted',
  async () => {
    const {
      repository,
      calls,
    } = createRepository({
      createImplementation() {
        const error =
          new Error(
            'Duplicate reference number',
          );

        error.code =
          11000;

        error.keyPattern = {
          referenceNumber:
            1,
        };

        throw error;
      },
    });

    await assert.rejects(
      () =>
        createFieldIncident(
          createInput(),
          createRanger(),
          repository,
          [],
          null,
          'test',
        ),
      {
        status:
          500,

        message:
          'The field incident could not be saved.',
      },
    );

    assert.equal(
      calls.create.length,
      5,
    );
  },
);

test(
  'returns HTTP 500 style error when repository create fails',
  async () => {
    const {
      repository,
    } = createRepository({
      createImplementation() {
        throw new Error(
          'Database unavailable',
        );
      },
    });

    await assert.rejects(
      () =>
        createFieldIncident(
          createInput(),
          createRanger(),
          repository,
          [],
          null,
          'test',
        ),
      {
        status:
          500,

        message:
          'The field incident could not be saved.',
      },
    );
  },
);

test(
  'recovers from concurrent duplicate clientIncidentId collision',
  async () => {
    const existing =
      createStoredIncident({
        referenceNumber:
          'FI-CONCURRENT-001',
      });

    let lookupCount = 0;

    const calls = {
      create:
        0,

      lookup:
        0,
    };

    const repository = {
      async findByClientIncidentId() {
        calls.lookup += 1;

        lookupCount += 1;

        /*
         * First lookup happens before create
         * and finds nothing.
         *
         * Second lookup happens after the
         * duplicate-key collision and finds
         * the incident saved by the other
         * concurrent request.
         */
        if (
          lookupCount === 1
        ) {
          return null;
        }

        return existing;
      },

      async create() {
        calls.create += 1;

        const error =
          new Error(
            'Duplicate client incident ID',
          );

        error.code =
          11000;

        error.keyPattern = {
          rangerUserId:
            1,

          clientIncidentId:
            1,
        };

        error.keyValue = {
          rangerUserId:
            'ranger-user-001',

          clientIncidentId:
            'client-incident-001',
        };

        throw error;
      },
    };

    const result =
      await createFieldIncident(
        createInput(),
        createRanger(),
        repository,
        [],
        null,
        'test',
      );

    assert.equal(
      calls.create,
      1,
    );

    assert.equal(
      calls.lookup,
      2,
    );

    assert.equal(
      result.referenceNumber,
      'FI-CONCURRENT-001',
    );

    assert.equal(
      result.clientIncidentId,
      'client-incident-001',
    );
  },
);

test(
  'returns conflict when duplicate clientIncidentId exists but cannot be retrieved',
  async () => {
    let lookupCount = 0;

    const repository = {
      async findByClientIncidentId() {
        lookupCount += 1;

        return null;
      },

      async create() {
        const error =
          new Error(
            'Duplicate client incident ID',
          );

        error.code =
          11000;

        error.keyPattern = {
          rangerUserId:
            1,

          clientIncidentId:
            1,
        };

        throw error;
      },
    };

    await assert.rejects(
      () =>
        createFieldIncident(
          createInput(),
          createRanger(),
          repository,
          [],
          null,
          'test',
        ),
      {
        status:
          409,

        message:
          'This field incident has already been submitted.',
      },
    );

    assert.equal(
      lookupCount,
      2,
    );
  },
);

test(
  'rolls back uploaded evidence when database save fails',
  async () => {
    const destroyed = [];

    const cloudinary = {
      uploader: {
        upload_stream(
          options,
          callback,
        ) {
          return {
            on() {
              return this;
            },

            end() {
              callback(
                null,
                {
                  public_id:
                    'wildguard/test-image',

                  secure_url:
                    'https://example.com/test.jpg',

                  resource_type:
                    'image',

                  bytes:
                    4,

                  format:
                    'jpg',

                  width:
                    100,

                  height:
                    100,
                },
              );
            },
          };
        },

        async destroy(
          publicId,
          options,
        ) {
          destroyed.push({
            publicId,
            options,
          });

          return {
            result:
              'ok',
          };
        },
      },
    };

    const file = {
      buffer:
        Buffer.from(
          'test',
        ),

      size:
        4,

      mimetype:
        'image/jpeg',

      originalname:
        'evidence.jpg',
    };

    const repository = {
      async findByClientIncidentId() {
        return null;
      },

      async create() {
        throw new Error(
          'Database unavailable',
        );
      },
    };

    await assert.rejects(
      () =>
        createFieldIncident(
          createInput(),
          createRanger(),
          repository,
          [
            file,
          ],
          cloudinary,
          'test',
        ),
      {
        status:
          500,

        message:
          'The field incident could not be saved.',
      },
    );

    assert.equal(
      destroyed.length,
      1,
    );

    assert.equal(
      destroyed[0].publicId,
      'wildguard/test-image',
    );

    assert.equal(
      destroyed[0].options.resource_type,
      'image',
    );
  },
);
test(
    'creates incident with uploaded evidence and returns public evidence metadata',
    async () => {
      const cloudinary = {
        uploader: {
          upload_stream(
            options,
            callback,
          ) {
            return {
              on() {
                return this;
              },
  
              end() {
                callback(
                  null,
                  {
                    public_id:
                      'wildguard/field-incidents/test-image',
  
                    secure_url:
                      'https://example.com/evidence.jpg',
  
                    resource_type:
                      'image',
  
                    bytes:
                      2048,
  
                    format:
                      'jpg',
  
                    width:
                      800,
  
                    height:
                      600,
                  },
                );
              },
            };
          },
  
          async destroy() {
            return {
              result:
                'ok',
            };
          },
        },
      };
  
      const file = {
        buffer:
          Buffer.from(
            'image-data',
          ),
  
        size:
          10,
  
        mimetype:
          'image/jpeg',
  
        originalname:
          'snare-evidence.jpg',
      };
  
      const {
        repository,
        calls,
      } = createRepository();
  
      const result =
        await createFieldIncident(
          createInput(),
          createRanger(),
          repository,
          [
            file,
          ],
          cloudinary,
          'test',
        );
  
      assert.equal(
        calls.create.length,
        1,
      );
  
      assert.equal(
        calls.create[0]
          .evidence.length,
        1,
      );
  
      assert.equal(
        result.evidence.length,
        1,
      );
  
      assert.deepEqual(
        result.evidence[0],
        {
          secureUrl:
            'https://example.com/evidence.jpg',
  
          resourceType:
            'image',
  
          originalName:
            'snare-evidence.jpg',
  
          mimeType:
            'image/jpeg',
  
          bytes:
            2048,
  
          format:
            'jpg',
  
          width:
            800,
  
          height:
            600,
  
          duration:
            null,
        },
      );
    },
  );