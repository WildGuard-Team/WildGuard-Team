import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatFieldIncidentCoordinates,
  hasValidFieldIncidentCoordinates,
  reconcileFieldIncidentLocation,
} from './field-incident-location.js';

const gpsCoordinates = { latitude: 7.123456789, longitude: 80.987654321 };

test('only finite numeric coordinate pairs inside geographic bounds are valid', () => {
  for (const coordinates of [
    { latitude: 0, longitude: 0 },
    { latitude: -90, longitude: -180 },
    { latitude: 90, longitude: 180 },
    gpsCoordinates,
  ]) assert.equal(hasValidFieldIncidentCoordinates(coordinates), true);

  for (const coordinates of [
    null, undefined, {}, [], '7, 80',
    { latitude: '7', longitude: 80 },
    { latitude: 91, longitude: 80 },
    { latitude: 7, longitude: -181 },
    { latitude: NaN, longitude: 80 },
    { latitude: 7, longitude: Infinity },
  ]) {
    assert.equal(hasValidFieldIncidentCoordinates(coordinates), false);
    assert.equal(formatFieldIncidentCoordinates(coordinates), 'Not provided');
  }
});

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

test('a clicked or dragged map marker keeps full coordinate precision through reconciliation', () => {
  const location = {
    source: 'MANUAL',
    coordinates: gpsCoordinates,
    manualCoordinates: formatFieldIncidentCoordinates(gpsCoordinates),
    description: 'Beside the patrol track',
  };
  assert.equal(reconcileFieldIncidentLocation(location), location);
  assert.deepEqual(reconcileFieldIncidentLocation(location).coordinates, gpsCoordinates);
});

test('a saved API location without input text restores its marker and display coordinates', () => {
  const location = { source: 'MANUAL', coordinates: gpsCoordinates, description: 'Saved location' };
  assert.deepEqual(reconcileFieldIncidentLocation(location), {
    ...location,
    manualCoordinates: '7.123457, 80.987654',
  });
});

test('explicitly cleared coordinates do not restore an old saved marker', () => {
  const location = {
    source: 'MANUAL',
    coordinates: gpsCoordinates,
    manualCoordinates: '',
    description: 'The location is described manually',
  };
  assert.deepEqual(reconcileFieldIncidentLocation(location), { ...location, coordinates: null });
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
