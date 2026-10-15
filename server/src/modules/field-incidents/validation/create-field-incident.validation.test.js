import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateCreateFieldIncident,
} from './create-field-incident.validation.js';

function createValidBody() {
  return {
    clientIncidentId:
      'test-client-id-001',

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
      'Wire snare discovered near the patrol trail.',

    additionalNotes:
      'Inspect the surrounding area.',
  };
}

test(
  'accepts a valid field incident',
  () => {
    const result =
      validateCreateFieldIncident(
        createValidBody(),
      );

    assert.equal(
      result.clientIncidentId,
      'test-client-id-001',
    );

    assert.equal(
      result.incidentType,
      'POACHING',
    );

    assert.equal(
      result.riskLevel,
      'HIGH',
    );

    assert.equal(
      result.parkZone,
      'Yala National Park',
    );

    assert.equal(
      result.blockArea,
      'Block 1',
    );

    assert.equal(
      result.location.source,
      'GPS',
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

    assert.ok(
      result.incidentDateTime
        instanceof Date,
    );
  },
);

test(
  'trims text values',
  () => {
    const body =
      createValidBody();

    body.parkZone =
      '  Yala National Park  ';

    body.blockArea =
      '  Block 1  ';

    body.description =
      '  Wire snare discovered near the patrol trail.  ';

    const result =
      validateCreateFieldIncident(
        body,
      );

    assert.equal(
      result.parkZone,
      'Yala National Park',
    );

    assert.equal(
      result.blockArea,
      'Block 1',
    );

    assert.equal(
      result.description,
      'Wire snare discovered near the patrol trail.',
    );
  },
);

test(
  'allows clientIncidentId to be omitted',
  () => {
    const body =
      createValidBody();

    delete body.clientIncidentId;

    const result =
      validateCreateFieldIncident(
        body,
      );

    assert.equal(
      result.clientIncidentId,
      undefined,
    );
  },
);

test(
  'rejects clientIncidentId longer than 100 characters',
  () => {
    const body =
      createValidBody();

    body.clientIncidentId =
      'a'.repeat(101);

    assert.throws(
      () =>
        validateCreateFieldIncident(
          body,
        ),
      {
        status: 400,
        message:
          'Client incident ID cannot exceed 100 characters.',
      },
    );
  },
);

test(
  'rejects invalid incident type',
  () => {
    const body =
      createValidBody();

    body.incidentType =
      'INVALID_TYPE';

    assert.throws(
      () =>
        validateCreateFieldIncident(
          body,
        ),
      {
        status: 400,
      },
    );
  },
);

test(
  'rejects invalid risk level',
  () => {
    const body =
      createValidBody();

    body.riskLevel =
      'CRITICAL';

    assert.throws(
      () =>
        validateCreateFieldIncident(
          body,
        ),
      {
        status: 400,
      },
    );
  },
);

test(
  'rejects missing incident date and time',
  () => {
    const body =
      createValidBody();

    body.incidentDateTime =
      '';

    assert.throws(
      () =>
        validateCreateFieldIncident(
          body,
        ),
      {
        status: 400,
        message:
          'Incident date and time are required.',
      },
    );
  },
);

test(
  'rejects invalid incident date and time',
  () => {
    const body =
      createValidBody();

    body.incidentDateTime =
      'not-a-date';

    assert.throws(
      () =>
        validateCreateFieldIncident(
          body,
        ),
      {
        status: 400,
        message:
          'Incident date and time are invalid.',
      },
    );
  },
);

test(
  'rejects latitude greater than 90',
  () => {
    const body =
      createValidBody();

    body.location.coordinates.latitude =
      91;

    assert.throws(
      () =>
        validateCreateFieldIncident(
          body,
        ),
      {
        status: 400,
        message:
          'Location coordinates are invalid.',
      },
    );
  },
);

test(
  'rejects longitude greater than 180',
  () => {
    const body =
      createValidBody();

    body.location.coordinates.longitude =
      181;

    assert.throws(
      () =>
        validateCreateFieldIncident(
          body,
        ),
      {
        status: 400,
        message:
          'Location coordinates are invalid.',
      },
    );
  },
);

test(
  'rejects GPS source without coordinates',
  () => {
    const body =
      createValidBody();

    body.location.coordinates =
      null;

    assert.throws(
      () =>
        validateCreateFieldIncident(
          body,
        ),
      {
        status: 400,
        message:
          'GPS coordinates are required when the location source is GPS.',
      },
    );
  },
);

test(
  'accepts manual location without coordinates when description exists',
  () => {
    const body =
      createValidBody();

    body.location = {
      source:
        'MANUAL',

      coordinates:
        null,

      description:
        'Near the northern ranger station',
    };

    const result =
      validateCreateFieldIncident(
        body,
      );

    assert.equal(
      result.location.source,
      'MANUAL',
    );

    assert.equal(
      result.location.coordinates,
      null,
    );

    assert.equal(
      result.location.description,
      'Near the northern ranger station',
    );
  },
);

test(
  'rejects manual location without coordinates or description',
  () => {
    const body =
      createValidBody();

    body.location = {
      source:
        'MANUAL',

      coordinates:
        null,

      description:
        '',
    };

    assert.throws(
      () =>
        validateCreateFieldIncident(
          body,
        ),
      {
        status: 400,
        message:
          'Provide GPS coordinates or a location description.',
      },
    );
  },
);

test(
  'rejects incident description shorter than 10 characters',
  () => {
    const body =
      createValidBody();

    body.description =
      'Too short';

    assert.throws(
      () =>
        validateCreateFieldIncident(
          body,
        ),
      {
        status: 400,
        message:
          'Incident description must be between 10 and 1000 characters.',
      },
    );
  },
);

test(
  'rejects additional notes longer than 1000 characters',
  () => {
    const body =
      createValidBody();

    body.additionalNotes =
      'a'.repeat(1001);

    assert.throws(
      () =>
        validateCreateFieldIncident(
          body,
        ),
      {
        status: 400,
        message:
          'Additional notes cannot exceed 1000 characters.',
      },
    );
  },
);

test(
  'rejects unsupported request fields',
  () => {
    const body =
      createValidBody();

    body.adminOnlyField =
      'not allowed';

    assert.throws(
      () =>
        validateCreateFieldIncident(
          body,
        ),
      {
        status: 400,
        message:
          'The field incident request contains unsupported fields.',
      },
    );
  },
);

test(
  'rejects non-object request body',
  () => {
    assert.throws(
      () =>
        validateCreateFieldIncident(
          null,
        ),
      {
        status: 400,
        message:
          'A JSON object is required.',
      },
    );
  },
);