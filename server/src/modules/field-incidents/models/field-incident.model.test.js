import test from 'node:test';
import assert from 'node:assert/strict';

import { FieldIncident } from './field-incident.model.js';

function createIncident(point) {
  return new FieldIncident({
    referenceNumber: 'FI-20261015-MAP001',
    rangerUserId: '507f1f77bcf86cd799439011',
    rangerIdSnapshot: 'DWC-RG-00127',
    assignedParkSnapshot: 'Yala National Park',
    incidentType: 'POACHING',
    incidentDateTime: new Date('2026-10-15T06:00:00.000Z'),
    riskLevel: 'HIGH',
    parkZone: 'Yala National Park',
    blockArea: 'Block 1',
    location: { source: 'MANUAL', point, description: 'Beside the patrol trail.' },
    description: 'A wire snare was found beside the patrol trail.',
  });
}

test('database model permits an optional point and valid geographic boundaries', () => {
  assert.equal(createIncident().validateSync(), undefined);
  for (const coordinates of [[0, 0], [-180, -90], [180, 90], [81.5185, 6.3725]]) {
    assert.equal(createIncident({ type: 'Point', coordinates }).validateSync(), undefined);
  }
});

test('database model rejects malformed or out-of-range GeoJSON coordinates', () => {
  for (const coordinates of [[], [81], [81, 6, 1], [181, 6], [81, 91], [-181, 6], [81, -91], [null, 6], [Infinity, 6]]) {
    const error = createIncident({ type: 'Point', coordinates }).validateSync();
    assert.ok(error?.errors['location.point.coordinates'], JSON.stringify(coordinates));
  }
});
