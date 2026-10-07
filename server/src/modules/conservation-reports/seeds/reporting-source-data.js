import {
  REPORTING_DATASET_ID, SEEDED_DATA_PROVENANCE,
} from '../config/reporting-data.constants.js';

const provenance = Object.freeze({
  dataProvenance: SEEDED_DATA_PROVENANCE,
  datasetId: REPORTING_DATASET_ID,
});

export const reportSourceIncidents = Object.freeze([
  incident('WG-EVT-001', '2026-07-04T03:15:00.000Z', 'Yala National Park', 'Block I - Palatupana', 'WILDLIFE_SIGHTING', 'LOW', false, null, 'Sri Lankan leopard'),
  incident('WG-EVT-002', '2026-07-12T17:40:00.000Z', 'Yala National Park', 'Katagamuwa Boundary', 'HUMAN_WILDLIFE_CONFLICT', 'HIGH', true, 'LIVESTOCK_DEPREDATION', 'Sri Lankan leopard'),
  incident('WG-EVT-003', '2026-07-25T12:10:00.000Z', 'Udawalawe National Park', 'Ath Athuru Sevana Road', 'HUMAN_WILDLIFE_CONFLICT', 'MEDIUM', true, 'ROAD_OBSTRUCTION', 'Sri Lankan elephant'),
  incident('WG-EVT-004', '2026-08-01T06:35:00.000Z', 'Wilpattu National Park', 'Maradanmaduwa', 'SUSPICIOUS_ACTIVITY', 'HIGH', false, null, null),
  incident('WG-EVT-005', '2026-08-08T14:20:00.000Z', 'Udawalawe National Park', 'Southern Boundary', 'INJURED_ANIMAL', 'CRITICAL', false, null, 'Sri Lankan elephant'),
  incident('WG-EVT-006', '2026-08-14T19:05:00.000Z', 'Yala National Park', 'Sithulpawwa Buffer Zone', 'HUMAN_WILDLIFE_CONFLICT', 'HIGH', true, 'CROP_DAMAGE', 'Sri Lankan elephant'),
  incident('WG-EVT-007', '2026-08-22T05:55:00.000Z', 'Wilpattu National Park', 'Kumbuk Wila', 'WILDLIFE_SIGHTING', 'LOW', false, null, 'Sloth bear'),
  incident('WG-EVT-008', '2026-09-01T10:30:00.000Z', 'Yala National Park', 'Block I - Patanangala', 'HUMAN_WILDLIFE_CONFLICT', 'MEDIUM', true, 'PROPERTY_DAMAGE', 'Wild boar'),
  incident('WG-EVT-009', '2026-09-05T02:45:00.000Z', 'Udawalawe National Park', 'Mau Ara Boundary', 'HUMAN_WILDLIFE_CONFLICT', 'CRITICAL', true, 'HUMAN_INJURY', 'Sri Lankan elephant'),
  incident('WG-EVT-010', '2026-09-09T16:00:00.000Z', 'Wilpattu National Park', 'Hunuwilagama Entrance', 'SUSPICIOUS_ACTIVITY', 'MEDIUM', false, null, null),
  incident('WG-EVT-011', '2026-09-14T11:25:00.000Z', 'Yala National Park', 'Menik River Corridor', 'HUMAN_WILDLIFE_CONFLICT', 'HIGH', true, 'CROP_DAMAGE', 'Sri Lankan elephant'),
  incident('WG-EVT-012', '2026-09-20T07:10:00.000Z', 'Udawalawe National Park', 'Reservoir Grassland', 'WILDLIFE_SIGHTING', 'LOW', false, null, 'Water buffalo'),
]);

export const patrolRoutes = Object.freeze([
  route('WG-ROUTE-YA-NORTH', 'Yala National Park', 'Northern Boundary Route', ['YA-N1', 'YA-N2', 'YA-N3'], 21),
  route('WG-ROUTE-YA-RIVER', 'Yala National Park', 'Menik River Route', ['YA-R1', 'YA-R2'], 14),
  route('WG-ROUTE-WI-EAST', 'Wilpattu National Park', 'Eastern Lakes Route', ['WI-E1', 'WI-E2', 'WI-E3'], 25),
  route('WG-ROUTE-UD-SOUTH', 'Udawalawe National Park', 'Southern Boundary Route', ['UD-S1', 'UD-S2'], 19),
]);

export const patrolRecords = Object.freeze([
  patrol('WG-PATROL-001', 'WG-ROUTE-YA-NORTH', 'Yala National Park', 'Yala Alpha', '2026-09-01T01:00:00.000Z', '2026-09-01T05:00:00.000Z', 'COMPLETED', 18, ['YA-N1', 'YA-N2'], 3),
  patrol('WG-PATROL-002', 'WG-ROUTE-YA-NORTH', 'Yala National Park', 'Yala Bravo', '2026-09-03T00:30:00.000Z', '2026-09-03T05:30:00.000Z', 'COMPLETED', 22, ['YA-N2', 'YA-N3'], 4),
  patrol('WG-PATROL-003', 'WG-ROUTE-YA-RIVER', 'Yala National Park', 'Yala Alpha', '2026-09-05T02:00:00.000Z', '2026-09-05T05:00:00.000Z', 'COMPLETED', 12, ['YA-R1'], 2),
  patrol('WG-PATROL-004', 'WG-ROUTE-YA-NORTH', 'Yala National Park', 'Yala Charlie', '2026-09-04T08:00:00.000Z', '2026-09-04T09:00:00.000Z', 'CANCELLED', 0, [], 0),
  patrol('WG-PATROL-005', 'WG-ROUTE-YA-RIVER', 'Yala National Park', 'Yala Bravo', '2026-09-11T01:30:00.000Z', '2026-09-11T05:30:00.000Z', 'COMPLETED', 14, ['YA-R1', 'YA-R2'], 5),
  patrol('WG-PATROL-006', 'WG-ROUTE-WI-EAST', 'Wilpattu National Park', 'Wilpattu Alpha', '2026-09-02T00:00:00.000Z', '2026-09-02T06:00:00.000Z', 'COMPLETED', 24, ['WI-E1', 'WI-E2'], 6),
  patrol('WG-PATROL-007', 'WG-ROUTE-WI-EAST', 'Wilpattu National Park', 'Wilpattu Bravo', '2026-09-08T01:00:00.000Z', '2026-09-08T06:30:00.000Z', 'COMPLETED', 26, ['WI-E2', 'WI-E3'], 4),
  patrol('WG-PATROL-008', 'WG-ROUTE-UD-SOUTH', 'Udawalawe National Park', 'Udawalawe Alpha', '2026-09-03T00:30:00.000Z', '2026-09-03T04:30:00.000Z', 'COMPLETED', 18, ['UD-S1'], 7),
  patrol('WG-PATROL-009', 'WG-ROUTE-UD-SOUTH', 'Udawalawe National Park', 'Udawalawe Bravo', '2026-09-10T01:00:00.000Z', '2026-09-10T05:30:00.000Z', 'COMPLETED', 20, ['UD-S1', 'UD-S2'], 5),
]);

export const reportingSourceData = Object.freeze({
  incidents: reportSourceIncidents,
  routes: patrolRoutes,
  patrols: patrolRecords,
});

function incident(sourceId, occurredAt, park, location, incidentType, severity, humanWildlifeConflict, conflictType, species) {
  return Object.freeze({
    sourceId, occurredAt, park, location, incidentType, severity,
    humanWildlifeConflict, conflictType, species, ...provenance,
  });
}

function route(sourceId, park, name, zones, plannedDistanceKm) {
  return Object.freeze({ sourceId, park, name, zones: Object.freeze(zones), plannedDistanceKm, ...provenance });
}

function patrol(sourceId, routeSourceId, park, rangerTeam, startedAt, endedAt, status, distanceKm, zonesCovered, observations) {
  return Object.freeze({
    sourceId, routeSourceId, park, rangerTeam, startedAt, endedAt, status,
    distanceKm, zonesCovered: Object.freeze(zonesCovered), observations, ...provenance,
  });
}
