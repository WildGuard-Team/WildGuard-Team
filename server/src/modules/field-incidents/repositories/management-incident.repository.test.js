import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildManagementIncidentPipeline,
  managementIncidentScope,
  queryManagementIncidents,
} from './management-incident.repository.js';
import { validateManagementIncidentQuery } from '../validation/list-management-incidents.validation.js';

const manager = { assignedPark: ' Yala National  Park ' };
function pipeline(rawQuery = {}) {
  return buildManagementIncidentPipeline(manager, validateManagementIncidentQuery(rawQuery));
}

test('every facet is scoped first by trusted park snapshot and excludes spoofed cross-park reports', () => {
  const stages = pipeline({ parkZone: 'Wilpattu National Park', assignedPark: 'Wilpattu National Park' });
  assert.equal(stages.length, 2);
  assert.deepEqual(Object.keys(stages[0].$match), ['assignedParkSnapshot']);
  const scope = stages[0].$match.assignedParkSnapshot;
  const reports = [
    { assignedParkSnapshot: 'yala national park', parkZone: 'Block I' },
    { assignedParkSnapshot: 'Yala   National Park', parkZone: 'Wilpattu National Park' },
    { assignedParkSnapshot: 'Wilpattu National Park', parkZone: 'Yala National Park' },
    { assignedParkSnapshot: 'Greater Yala National Park', parkZone: 'Yala National Park' },
  ];
  assert.deepEqual(reports.filter((report) => scope.test(report.assignedParkSnapshot)), reports.slice(0, 2));
  assert.equal(stages[1].$facet.statistics.length, 1);
  assert.equal(stages[1].$facet.parks.some((stage) => stage.$match?.parkZone instanceof RegExp), false);
});

test('corrupt assignments fail closed and park regex metacharacters stay literal', () => {
  for (const value of [['Yala'], { $ne: '' }]) {
    assert.throws(() => managementIncidentScope({ assignedPark: value }), { status: 403 });
  }
  const scope = managementIncidentScope({ assignedPark: 'Park (A).*' }).assignedParkSnapshot;
  assert.equal(scope.test('Park (A).*'), true);
  assert.equal(scope.test('Park Anything'), false);
});

test('unassigned managers have explicitly authorized all-park scope before all facets', () => {
  for (const assignedPark of [undefined, null, '', '   ']) {
    const stages = buildManagementIncidentPipeline({ assignedPark }, validateManagementIncidentQuery({ parkZone: 'Yala' }));
    assert.deepEqual(stages[0], { $match: {} });
    assert.deepEqual(Object.keys(stages[1].$facet), ['statistics', 'parks', 'incidents', 'filteredTotal']);
    assert.equal(stages[1].$facet.incidents[0].$match.parkZone.test('Yala'), true);
  }
});

test('combined filters precede pagination with stable sorting and safe ranger projection', () => {
  const stages = pipeline({
    incidentType: 'POACHING', riskLevel: 'HIGH', parkZone: 'Block I', status: 'SUBMITTED',
    startDate: '2026-10-15', endDate: '2026-10-15', page: '3', pageSize: '10', sort: 'oldest',
  });
  const facets = stages[1].$facet;
  const incidents = facets.incidents;
  assert.equal(incidents[0].$match.incidentType, 'POACHING');
  assert.equal(incidents[0].$match.riskLevel, 'HIGH');
  assert.equal(incidents[0].$match.status, 'SUBMITTED');
  assert.equal(incidents[0].$match.parkZone.test('block i'), true);
  const dates = incidents[0].$match.incidentDateTime;
  assert.equal(dates.$gte.toISOString(), '2026-10-14T18:30:00.000Z');
  assert.equal(dates.$lt.toISOString(), '2026-10-15T18:30:00.000Z');
  assert.deepEqual(incidents[1].$lookup.pipeline, [{ $project: { fullName: 1, rangerId: 1 } }]);
  assert.deepEqual(incidents.find((stage) => stage.$sort).$sort, { incidentDateTime: 1, createdAt: 1, _id: 1 });
  assert.equal(incidents.find((stage) => '$skip' in stage).$skip, 20);
  assert.equal(incidents.find((stage) => stage.$limit).$limit, 10);
  assert.deepEqual(facets.filteredTotal, [{ $match: incidents[0].$match }, { $count: 'count' }]);
  assert.equal(incidents.at(-1).$project.rangerUserId, undefined);
});

test('search supports incident ID, ranger name, type codes and human-readable type labels', () => {
  const facets = pipeline({ search: 'Injured Animal' })[1].$facet;
  const search = facets.incidents.find((stage) => stage.$match?.$or).$match;
  assert.equal(search.$or[0].referenceNumber.test('FI-Injured Animal'), true);
  assert.equal(search.$or[1]['ranger.fullName'].test('Injured Animal Ranger'), true);
  assert.equal(search.$or[2].incidentType.test('INJURED_ANIMAL'), true);
  assert.deepEqual(search.$or[3].incidentType.$in, ['INJURED_ANIMAL']);
  assert.deepEqual(facets.filteredTotal.slice(0, -1), facets.incidents.slice(0, 4));
  const snare = pipeline({ search: 'snare' })[1].$facet.incidents[3].$match;
  assert.deepEqual(snare.$or[3].incidentType.$in, ['POACHING']);
});

test('search and park filters escape regex operators rather than interpreting user patterns', () => {
  const stages = pipeline({ search: '(a+)+$.*[', parkZone: 'Block (I).*' });
  const incidents = stages[1].$facet.incidents;
  const search = incidents[3].$match.$or[0].referenceNumber;
  assert.equal(search.test('FI-(a+)+$.*['), true);
  assert.equal(search.test('aaaaaaaaaaaaaaaa'), false);
  assert.equal(incidents[0].$match.parkZone.test('Block (I).*'), true);
  assert.equal(incidents[0].$match.parkZone.test('Block Idddd'), false);
});

test('aggregate results retain unfiltered scoped statistics and filtered counts', async () => {
  let captured;
  const model = { async aggregate(stages) {
    captured = stages;
    return [{
      statistics: [{ _id: null, total: 50, low: 10, medium: 20, high: 20 }],
      incidents: [{ _id: 'one' }], filteredTotal: [{ count: 3 }],
      parks: [{ _id: 'Block I' }, { _id: 'Block II' }],
    }];
  } };
  const result = await queryManagementIncidents(model, manager, validateManagementIncidentQuery({ riskLevel: 'HIGH' }));
  assert.equal(captured[0].$match.assignedParkSnapshot.test('Yala National Park'), true);
  assert.deepEqual(result, {
    incidents: [{ _id: 'one' }], total: 3, parks: ['Block I', 'Block II'],
    statistics: { total: 50, low: 10, medium: 20, high: 20 },
  });
});

test('empty aggregate results return usable zero statistics and options', async () => {
  const result = await queryManagementIncidents({ async aggregate() { return []; } }, manager, validateManagementIncidentQuery());
  assert.deepEqual(result, { incidents: [], statistics: { total: 0, low: 0, medium: 0, high: 0 }, total: 0, parks: [] });
});
