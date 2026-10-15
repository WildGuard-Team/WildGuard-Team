import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmptyDraft } from '../utils/field-incident-draft.js';
import { formatFieldIncidentCoordinates } from '../utils/field-incident-location.js';
import { submitFieldIncident } from './field-incident.service.js';

const coordinates = { latitude: 6.37298123456, longitude: 81.51234789123 };

function createDraft() {
  return {
    ...createEmptyDraft(),
    incidentType: 'ILLEGAL_LOGGING',
    riskLevel: 'LOW',
    parkZone: 'Yala National Park',
    blockArea: 'Block 1',
    description: 'Observed an incident during patrol.',
    location: {
      source: 'MANUAL', coordinates,
      manualCoordinates: formatFieldIncidentCoordinates(coordinates),
      description: 'Near the park gate',
    },
  };
}

for (const withEvidence of [false, true]) {
  test(`map coordinates reach the existing ${withEvidence ? 'multipart' : 'JSON'} incident record at full precision`, async (t) => {
    const draft = createDraft();
    if (withEvidence) draft.evidence = [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })];
    t.mock.method(globalThis, 'fetch', async (url, request) => {
      assert.equal(url, '/api/field-incidents');
      assert.equal(request.method, 'POST');
      const location = withEvidence
        ? JSON.parse(request.body.get('location'))
        : JSON.parse(request.body).location;
      assert.deepEqual(location, {
        source: 'MANUAL', coordinates, description: 'Near the park gate',
      });
      assert.equal(Object.hasOwn(location, 'manualCoordinates'), false);
      return { ok: true, status: 201, json: async () => ({ incident: { referenceNumber: 'FI-map' } }) };
    });
    assert.deepEqual(await submitFieldIncident(draft), { referenceNumber: 'FI-map' });
  });
}

test('cleared map coordinates submit as optional while keeping the location description', async (t) => {
  const draft = createDraft();
  draft.location.manualCoordinates = '';
  t.mock.method(globalThis, 'fetch', async (url, request) => {
    assert.equal(JSON.parse(request.body).location.coordinates, null);
    assert.equal(JSON.parse(request.body).location.description, 'Near the park gate');
    return { ok: true, status: 201, json: async () => ({ incident: { referenceNumber: 'FI-manual' } }) };
  });
  await submitFieldIncident(draft);
});

test('malformed numeric coordinates are rejected before sending an API request', async (t) => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('Invalid coordinates must not reach the API'));
  const draft = createDraft();
  for (const invalidCoordinates of [
    { latitude: 91, longitude: 80 },
    { latitude: 7, longitude: -181 },
    { latitude: 7, longitude: Infinity },
    { latitude: '7', longitude: 80 },
  ]) {
    await assert.rejects(submitFieldIncident({
      ...draft, location: { ...draft.location, coordinates: invalidCoordinates },
    }), /Enter valid GPS coordinates/);
  }
});

test('nonempty invalid manual GPS text cannot be silently dropped from submission', async (t) => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('Invalid manual GPS input must not reach the API'));
  const draft = createDraft();
  for (const manualCoordinates of ['91,181', '7,', 'invalid']) {
    await assert.rejects(submitFieldIncident({
      ...draft, location: { ...draft.location, coordinates: null, manualCoordinates },
    }), /Enter valid GPS coordinates/);
  }
});
