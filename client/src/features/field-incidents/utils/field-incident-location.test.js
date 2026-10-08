import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatFieldIncidentCoordinates,
  reconcileFieldIncidentLocation,
} from './field-incident-location.js';

const gpsCoordinates = { latitude: 7.123456789, longitude: 80.987654321 };

test('untouched GPS text keeps the original coordinate precision', () => {
  const location = {
    source: 'GPS',
    coordinates: gpsCoordinates,
    manualCoordinates: formatFieldIncidentCoordinates(gpsCoordinates),
    description: 'Near the park gate',
  };

  assert.equal(location.manualCoordinates, '7.123457, 80.987654');
  assert.equal(reconcileFieldIncidentLocation(location), location);
  assert.equal(location.coordinates.latitude, 7.123456789);
});

test('an old GPS draft with edited manual text adopts the manual coordinates', () => {
  const location = {
    source: 'GPS',
    coordinates: gpsCoordinates,
    manualCoordinates: '8.23456789, 81.34567891',
    description: 'Near the park gate',
  };

  assert.deepEqual(reconcileFieldIncidentLocation(location), {
    ...location,
    source: 'MANUAL',
    coordinates: { latitude: 8.23456789, longitude: 81.34567891 },
  });
  assert.equal(location.coordinates, gpsCoordinates);
});

test('incomplete manual input clears an old GPS value and preserves the description', () => {
  for (const manualCoordinates of ['8,', '8', '', 'invalid coordinates']) {
    const location = {
      source: 'GPS',
      coordinates: gpsCoordinates,
      manualCoordinates,
      description: 'Near the park gate',
    };

    assert.deepEqual(reconcileFieldIncidentLocation(location), {
      ...location,
      source: 'MANUAL',
      coordinates: null,
    });
  }
});

test('the empty location defaults and manual description fallback remain unchanged', () => {
  const emptyLocation = {
    source: null,
    coordinates: null,
    manualCoordinates: '',
    description: '',
  };
  assert.deepEqual(reconcileFieldIncidentLocation(emptyLocation), emptyLocation);

  const manualLocation = {
    ...emptyLocation,
    source: 'MANUAL',
    manualCoordinates: '8,',
    description: 'Near the park gate',
  };
  assert.deepEqual(reconcileFieldIncidentLocation(manualLocation), manualLocation);
});
