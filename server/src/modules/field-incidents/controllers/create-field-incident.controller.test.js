import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createFieldIncidentController,
} from './create-field-incident.controller.js';

function createValidBody() {
  return {
    clientIncidentId:
      'controller-test-001',

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
        'Near the eastern trail',
    },

    description:
      'Wire snare discovered near patrol trail.',

    additionalNotes:
      '',
  };
}

function createStoredIncident(
  input,
) {
  return {
    id:
      'incident-id-001',

    referenceNumber:
      input.referenceNumber
      ?? 'FI-20261008-CONTROLLER',

    clientIncidentId:
      input.clientIncidentId
      ?? null,

    rangerUserId:
      input.rangerUserId,

    rangerIdSnapshot:
      input.rangerIdSnapshot,

    assignedParkSnapshot:
      input.assignedParkSnapshot,

    incidentType:
      input.incidentType,

    incidentDateTime:
      input.incidentDateTime,

    riskLevel:
      input.riskLevel,

    parkZone:
      input.parkZone,

    blockArea:
      input.blockArea,

    /*
     * createFieldIncident() converts frontend
     * latitude/longitude into MongoDB GeoJSON
     * before calling repository.create().
     */
    location: {
      source:
        input.location.source,

      point:
        input.location.point,

      description:
        input.location.description,
    },

    description:
      input.description,

    additionalNotes:
      input.additionalNotes,

    evidence:
      input.evidence
      ?? [],

    status:
      input.status
      ?? 'SUBMITTED',

    createdAt:
      new Date(
        '2026-10-08T10:31:00.000Z',
      ),
  };
}

function createRepository() {
  return {
    async findByClientIncidentId() {
      return null;
    },

    async create(input) {
      return createStoredIncident(
        input,
      );
    },
  };
}

function createResponse() {
  return {
    statusCode:
      null,

    payload:
      null,

    status(code) {
      this.statusCode =
        code;

      return this;
    },

    json(payload) {
      this.payload =
        payload;

      return this;
    },
  };
}

function createRanger() {
  return {
    id:
      '507f1f77bcf86cd799439011',

    rangerId:
      'DWC-RG-00127',

    assignedPark:
      'Wilpattu National Park',
  };
}

test(
  'creates field incident from JSON request',
  async () => {
    const req = {
      body:
        createValidBody(),

      files:
        [],

      parkRanger:
        createRanger(),

      is() {
        return false;
      },
    };

    const res =
      createResponse();

    const controller =
      createFieldIncidentController(
        createRepository(),
        {
          cloudinary:
            null,

          nodeEnv:
            'test',
        },
      );

    await controller(
      req,
      res,
    );

    assert.equal(
      res.statusCode,
      201,
    );

    assert.equal(
      res.payload.message,
      'Field incident submitted successfully.',
    );

    assert.equal(
      res.payload.incident
        .clientIncidentId,
      'controller-test-001',
    );

    assert.equal(
      res.payload.incident
        .incidentType,
      'POACHING',
    );

    assert.equal(
      res.payload.incident
        .status,
      'SUBMITTED',
    );

    assert.deepEqual(
      res.payload.incident
        .location.coordinates,
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
  'parses location JSON from multipart request',
  async () => {
    const body =
      createValidBody();

    body.location =
      JSON.stringify(
        body.location,
      );

    const req = {
      body,

      files:
        [],

      parkRanger:
        createRanger(),

      is(type) {
        return (
          type
          === 'multipart/form-data'
        );
      },
    };

    const res =
      createResponse();

    const controller =
      createFieldIncidentController(
        createRepository(),
        {
          cloudinary:
            null,

          nodeEnv:
            'test',
        },
      );

    await controller(
      req,
      res,
    );

    assert.equal(
      res.statusCode,
      201,
    );

    assert.equal(
      res.payload.incident
        .location.source,
      'GPS',
    );

    assert.deepEqual(
      res.payload.incident
        .location.coordinates,
      {
        latitude:
          6.933144,

        longitude:
          79.844487,
      },
    );

    assert.equal(
      res.payload.incident
        .location.description,
      'Near the eastern trail',
    );
  },
);

test(
  'rejects malformed multipart location JSON',
  async () => {
    const body =
      createValidBody();

    body.location =
      '{invalid-json';

    const req = {
      body,

      files:
        [],

      parkRanger:
        createRanger(),

      is(type) {
        return (
          type
          === 'multipart/form-data'
        );
      },
    };

    const res =
      createResponse();

    const controller =
      createFieldIncidentController(
        createRepository(),
        {
          cloudinary:
            null,

          nodeEnv:
            'test',
        },
      );

    await assert.rejects(
      () =>
        controller(
          req,
          res,
        ),
      {
        status:
          400,

        message:
          'Location must be valid JSON.',
      },
    );
  },
);

test(
  'rejects multipart location when it is not a string',
  async () => {
    const req = {
      body:
        createValidBody(),

      files:
        [],

      parkRanger:
        createRanger(),

      is(type) {
        return (
          type
          === 'multipart/form-data'
        );
      },
    };

    const res =
      createResponse();

    const controller =
      createFieldIncidentController(
        createRepository(),
        {
          cloudinary:
            null,

          nodeEnv:
            'test',
        },
      );

    await assert.rejects(
      () =>
        controller(
          req,
          res,
        ),
      {
        status:
          400,

        message:
          'Location must be valid JSON.',
      },
    );
  },
);

test(
  'uses an empty evidence array when req.files is missing',
  async () => {
    const req = {
      body:
        createValidBody(),

      parkRanger:
        createRanger(),

      is() {
        return false;
      },
    };

    const res =
      createResponse();

    const controller =
      createFieldIncidentController(
        createRepository(),
        {
          cloudinary:
            null,

          nodeEnv:
            'test',
        },
      );

    await controller(
      req,
      res,
    );

    assert.equal(
      res.statusCode,
      201,
    );

    assert.deepEqual(
      res.payload.incident
        .evidence,
      [],
    );
  },
);