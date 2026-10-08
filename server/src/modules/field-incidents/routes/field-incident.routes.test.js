import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

import {
  createFieldIncidentRouter,
} from './field-incident.routes.js';

import {
  createAuthToken,
} from '../../auth/utils/token.js';

import {
  errorHandler,
} from '../../../middleware/errors.js';

const JWT_SECRET =
  'field-incident-test-secret';

const RANGER_ID =
  '507f1f77bcf86cd799439011';

function createRanger() {
  return {
    id:
      RANGER_ID,

    role:
      'PARK_RANGER',

    approvalStatus:
      'APPROVED',

    rangerId:
      'DWC-RG-00127',

    assignedPark:
      'Wilpattu National Park',
  };
}

function createRepository() {
  return {
    async findByClientIncidentId() {
      return null;
    },

    async create(input) {
      return {
        ...input,

        id:
          'incident-database-id',

        createdAt:
          new Date(
            '2026-10-08T11:00:00.000Z',
          ),
      };
    },
  };
}

async function startServer() {
  const ranger =
    createRanger();

  const users = {
    async findById(id) {
      if (
        id === RANGER_ID
      ) {
        return ranger;
      }

      return null;
    },
  };

  const app =
    express();

  app.use(
    express.json(),
  );

  app.use(
    '/api/field-incidents',
    createFieldIncidentRouter(
      createRepository(),
      users,
      {
        jwtSecret:
          JWT_SECRET,

        cloudinary:
          null,

        nodeEnv:
          'test',
      },
    ),
  );

  app.use(
    errorHandler,
  );

  const server =
    await new Promise(
      (resolve) => {
        const instance =
          app.listen(
            0,
            '127.0.0.1',
            () => {
              resolve(
                instance,
              );
            },
          );
      },
    );

  const address =
    server.address();

  return {
    ranger,

    url:
      `http://127.0.0.1:${address.port}`,

    async close() {
      await new Promise(
        (resolve, reject) => {
          server.close(
            (error) => {
              if (error) {
                reject(
                  error,
                );

                return;
              }

              resolve();
            },
          );
        },
      );
    },
  };
}

test(
  'approved Park Ranger can submit a field incident through the protected route',
  async () => {
    const server =
      await startServer();

    try {
      const token =
        createAuthToken(
          server.ranger,
          JWT_SECRET,
          '1h',
        );

      const response =
        await fetch(
          `${server.url}/api/field-incidents`,
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',

              Cookie:
                `wildguard.token=${encodeURIComponent(token)}`,
            },

            body:
              JSON.stringify({
                clientIncidentId:
                  'route-test-001',

                incidentType:
                  'POACHING',

                incidentDateTime:
                  '2026-10-08T10:30:00.000Z',

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
                  'Wire snare discovered during a routine ranger patrol.',

                additionalNotes:
                  '',
              }),
          },
        );

      const body =
        await response.json();

      assert.equal(
        response.status,
        201,
      );

      assert.equal(
        body.message,
        'Field incident submitted successfully.',
      );

      assert.equal(
        body.incident.clientIncidentId,
        'route-test-001',
      );

      assert.equal(
        body.incident.incidentType,
        'POACHING',
      );

      assert.equal(
        body.incident.status,
        'SUBMITTED',
      );

      assert.deepEqual(
        body.incident.location.coordinates,
        {
          latitude:
            6.933144,

          longitude:
            79.844487,
        },
      );
    } finally {
      await server.close();
    }
  },
);