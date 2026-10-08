import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseCoordinates,
  validateFieldIncidentDetails,
} from './field-incident-details.validation.js';

test('coordinate input requires both values while the Ranger is typing', () => {
  for (const value of ['', '7', '7,', ',80', '7, ', ' ,80', ',', '7,80,1']) {
    assert.equal(parseCoordinates(value), null, value);
  }
});

test('complete coordinates preserve numeric precision and valid zero values', () => {
  assert.deepEqual(parseCoordinates(' 7.123456789, 80.987654321 '), {
    latitude: 7.123456789,
    longitude: 80.987654321,
  });
  assert.deepEqual(parseCoordinates('0, 0'), { latitude: 0, longitude: 0 });
});

test('coordinate ranges and invalid numeric values remain rejected', () => {
  for (const value of ['91,80', '-91,80', '7,181', '7,-181', 'north,80', '7,NaN']) {
    assert.equal(parseCoordinates(value), null, value);
  }
});

test('an incomplete coordinate input requires the existing location description fallback', () => {
  const draft = {
    incidentType: 'ILLEGAL_LOGGING',
    incidentDate: '2026-10-08',
    incidentTime: '12:00',
    riskLevel: 'LOW',
    parkZone: 'Yala National Park',
    blockArea: 'Block 1',
    location: { coordinates: null, manualCoordinates: '7,', description: '' },
    description: 'Observed an incident during patrol.',
    additionalNotes: '',
  };

  assert.equal(
    validateFieldIncidentDetails(draft).location,
    'Provide GPS coordinates or describe the incident location.',
  );
  assert.deepEqual(validateFieldIncidentDetails({
    ...draft,
    location: { ...draft.location, description: 'Near the northern park gate' },
  }), {});
});
