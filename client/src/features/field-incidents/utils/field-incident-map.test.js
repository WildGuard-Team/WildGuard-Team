import assert from 'node:assert/strict';
import test from 'node:test';

import { FIELD_INCIDENT_PENDING_SYNC, FIELD_INCIDENT_SUBMITTED } from '../config/field-incident.constants.js';
import { mergeFieldIncidents } from '../services/field-incident-history.service.js';
import {
  filterIncidentMap,
  getIncidentMapPosition,
  getMappedFieldIncidents,
  incidentMapKey,
  summarizeIncidentMap,
} from './field-incident-map.js';

const submitted = [
  {
    id: 'server-a', clientIncidentId: 'client-a', referenceNumber: 'FI-20261008-ABC123',
    incidentType: 'POACHING', riskLevel: 'HIGH', status: FIELD_INCIDENT_SUBMITTED,
    incidentDateTime: '2026-10-08T10:00:00Z', createdAt: '2026-10-08T11:00:00Z',
    parkZone: 'Yala National Park', blockArea: 'Block 1', description: 'Snare near the waterhole.',
    location: { source: 'GPS', coordinates: { latitude: 6.372156789, longitude: 81.518234567 } },
  },
  {
    id: 'server-b', clientIncidentId: 'client-b', referenceNumber: 'FI-20261007-DEF456',
    incidentType: 'WILDLIFE_SIGHTING', riskLevel: 'LOW', status: FIELD_INCIDENT_SUBMITTED,
    incidentDateTime: '2026-10-07T08:00:00Z', createdAt: '2026-10-07T09:00:00Z',
    parkZone: 'Wilpattu National Park', blockArea: 'North sector', description: 'Leopard sighting.',
    location: { source: 'MANUAL', coordinates: { latitude: 8.45, longitude: 80.05 } },
  },
];

const pendingRecord = {
  clientIncidentId: 'client-c', ownerId: 'ranger-a', status: FIELD_INCIDENT_PENDING_SYNC,
  createdAt: '2026-10-09T09:00:00Z',
  draft: {
    incidentType: 'INJURED_ANIMAL', incidentDate: '2026-10-09', incidentTime: '12:00',
    riskLevel: 'HIGH', parkZone: 'Yala National Park', blockArea: 'Block 2',
    location: { source: 'GPS', coordinates: { latitude: 6.3, longitude: 81.4 } },
    description: 'Injured elephant.',
  },
};

const noGpsRecord = {
  ...pendingRecord,
  clientIncidentId: 'client-no-gps',
  draft: {
    ...pendingRecord.draft,
    location: { source: 'MANUAL', coordinates: null, description: 'Near the southern gate.' },
  },
};
const incidents = mergeFieldIncidents(submitted, [pendingRecord, noGpsRecord], 'ranger-a');

test('valid public coordinates produce Leaflet latitude/longitude order with full precision', () => {
  assert.deepEqual(getIncidentMapPosition(submitted[0]), [6.372156789, 81.518234567]);
  assert.deepEqual(getIncidentMapPosition(submitted[1]), [8.45, 80.05]);
  assert.deepEqual(submitted[0].location.coordinates, { latitude: 6.372156789, longitude: 81.518234567 });
});

test('coordinate boundaries and zero are included', () => {
  for (const [latitude, longitude] of [[-90, -180], [90, 180], [0, 0]]) {
    assert.deepEqual(getIncidentMapPosition({ location: { coordinates: { latitude, longitude } } }), [latitude, longitude]);
  }
});

test('invalid, nonfinite, text, array and GeoJSON coordinates are excluded without coercion', () => {
  for (const coordinates of [
    null, undefined, {}, [], [6.3, 81.4], [81.4, 6.3], '6.3, 81.4',
    { latitude: '6.3', longitude: 81.4 },
    { latitude: 6.3, longitude: '81.4' },
    { latitude: null, longitude: 81.4 },
    { latitude: NaN, longitude: 81.4 },
    { latitude: 6.3, longitude: Infinity },
    { latitude: -Infinity, longitude: 81.4 },
    { latitude: 90.001, longitude: 81.4 },
    { latitude: -90.001, longitude: 81.4 },
    { latitude: 6.3, longitude: 180.001 },
    { latitude: 6.3, longitude: -180.001 },
    { type: 'Point', coordinates: [81.4, 6.3] },
  ]) {
    assert.equal(getIncidentMapPosition({ location: { coordinates } }), null);
  }
  assert.equal(getIncidentMapPosition({ geometry: { type: 'Point', coordinates: [81.4, 6.3] } }), null);
});

test('description-only and missing locations have no marker and mapped records retain their identity', () => {
  const missing = [null, undefined, {}, { location: null }, {
    location: { description: 'Gate', manualCoordinates: '6.3, 81.4' },
  }];
  for (const incident of missing) assert.equal(getIncidentMapPosition(incident), null);
  const mapped = getMappedFieldIncidents(incidents);
  assert.equal(mapped.length, 3);
  assert.equal(mapped[0], submitted[0]);
  assert.equal(mapped[1], submitted[1]);
  assert.equal(mapped[2], incidents[2]);
  assert.ok(!mapped.includes(incidents[3]));
  assert.equal(incidents.length, 4);
});

test('history merge supplies submitted and owner pending markers, deduplicates sync, and excludes foreign pending records', () => {
  const synchronized = { ...pendingRecord, clientIncidentId: 'client-a' };
  const foreign = { ...pendingRecord, clientIncidentId: 'client-private', ownerId: 'ranger-b' };
  const history = mergeFieldIncidents(submitted, [synchronized, pendingRecord, pendingRecord, foreign, noGpsRecord], 'ranger-a');
  assert.deepEqual(getMappedFieldIncidents(history).map((incident) => incident.clientIncidentId), [
    'client-a', 'client-b', 'client-c',
  ]);
  assert.equal(history.find((incident) => incident.clientIncidentId === 'client-a'), submitted[0]);
  assert.equal(getMappedFieldIncidents(history).find((incident) => incident.clientIncidentId === 'client-c').status, FIELD_INCIDENT_PENDING_SYNC);
  assert.ok(!history.some((incident) => incident.clientIncidentId === 'client-private'));
  assert.deepEqual(summarizeIncidentMap(history), { mapped: 3, highRisk: 2, pendingSync: 1, withoutGps: 1 });
});

test('map type, risk and status filters apply to mapped incidents and can be combined', () => {
  assert.deepEqual(filterIncidentMap(incidents, { incidentType: 'POACHING' }), [submitted[0]]);
  assert.equal(filterIncidentMap(incidents, { riskLevel: 'HIGH' }).length, 2);
  assert.equal(filterIncidentMap(incidents, { status: FIELD_INCIDENT_SUBMITTED }).length, 2);
  assert.deepEqual(filterIncidentMap(incidents, { status: FIELD_INCIDENT_PENDING_SYNC }), [incidents[2]]);
  assert.deepEqual(filterIncidentMap(incidents, {
    incidentType: 'POACHING', riskLevel: 'HIGH', status: FIELD_INCIDENT_SUBMITTED,
  }), [submitted[0]]);
  assert.deepEqual(filterIncidentMap(incidents, { incidentType: 'ILLEGAL_LOGGING' }), []);
  assert.equal(filterIncidentMap(incidents).length, 3);
});

test('search uses the existing reference, park, block and description matches', () => {
  for (const search of [' ABC123 ', 'YALA', 'block 1', 'Waterhole']) {
    assert.ok(filterIncidentMap(incidents, { search }).includes(submitted[0]));
  }
  assert.deepEqual(filterIncidentMap(incidents, { search: 'injured', status: FIELD_INCIDENT_PENDING_SYNC }), [incidents[2]]);
  assert.deepEqual(filterIncidentMap(incidents, { search: 'does not match' }), []);
  assert.deepEqual(filterIncidentMap(incidents, { search: 'southern gate' }), []);
});

test('summary high-risk and pending counts exclude incidents without GPS, including filtered results', () => {
  assert.deepEqual(summarizeIncidentMap(incidents), { mapped: 3, highRisk: 2, pendingSync: 1, withoutGps: 1 });
  assert.deepEqual(summarizeIncidentMap(filterIncidentMap(incidents, { riskLevel: 'LOW' })), {
    mapped: 1, highRisk: 0, pendingSync: 0, withoutGps: 0,
  });
  assert.deepEqual(summarizeIncidentMap([incidents[3]]), { mapped: 0, highRisk: 0, pendingSync: 0, withoutGps: 1 });
});

test('map filtering preserves history order and originals while reusing newest/oldest sorting', () => {
  const originalOrder = [...incidents];
  assert.deepEqual(filterIncidentMap(incidents).map((incident) => incident.clientIncidentId), ['client-c', 'client-a', 'client-b']);
  assert.deepEqual(filterIncidentMap(incidents, { sort: 'OLDEST' }).map((incident) => incident.clientIncidentId), ['client-b', 'client-a', 'client-c']);
  assert.deepEqual(incidents, originalOrder);
});

test('selection keys survive pending-to-submitted replacement and distinguish client IDs from server IDs', () => {
  assert.equal(incidentMapKey(incidents[2]), 'client:client-c');
  assert.equal(incidentMapKey({ id: 'server-c', clientIncidentId: 'client-c' }), incidentMapKey(incidents[2]));
  assert.equal(incidentMapKey({ id: 'legacy-id' }), 'id:legacy-id');
  assert.notEqual(incidentMapKey({ id: 'client-c' }), incidentMapKey(incidents[2]));
  assert.notEqual(incidentMapKey({ id: 'client:example' }), incidentMapKey({ clientIncidentId: 'example' }));
  assert.equal(incidentMapKey(null), null);
  assert.equal(incidentMapKey({}), null);
});

test('empty histories and filters return zero counts and no markers', () => {
  assert.deepEqual(getMappedFieldIncidents([]), []);
  assert.deepEqual(filterIncidentMap([], { riskLevel: 'HIGH' }), []);
  assert.deepEqual(summarizeIncidentMap([]), { mapped: 0, highRisk: 0, pendingSync: 0, withoutGps: 0 });
  assert.deepEqual(getMappedFieldIncidents(), []);
  assert.deepEqual(filterIncidentMap(), []);
  assert.deepEqual(summarizeIncidentMap(), { mapped: 0, highRisk: 0, pendingSync: 0, withoutGps: 0 });
});
