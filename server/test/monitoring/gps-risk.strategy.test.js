import test from "node:test";
import assert from "node:assert/strict";

import { GpsRiskStrategy } from "../../src/modules/monitoring/services/risk/gps-risk.strategy.js";

function createZone(overrides = {}) {
  return {
    _id: "zone-001",
    name: "Village Boundary Zone",
    center: {
      latitude: 7.2906,
      longitude: 80.6337,
    },
    radiusMeters: 2000,
    severity: "HIGH",
    active: true,
    ...overrides,
  };
}

test("GPS risk analysis - detects coordinate inside risk zone", () => {
  const strategy = new GpsRiskStrategy();

  const result = strategy.analyze({
    location: {
      latitude: 7.2906,
      longitude: 80.6337,
    },
    riskZones: [createZone()],
  });

  assert.equal(result.riskDetected, true);
  assert.equal(result.level, "HIGH");
  assert.equal(result.type, "HIGH_RISK_ZONE_ENTRY");
  assert.equal(
    result.message,
    "Sensor entered risk zone: Village Boundary Zone",
  );
  assert.equal(result.zoneId, "zone-001");
  assert.equal(result.distanceMeters, 0);

  assert.deepEqual(result.metadata, {
    zoneName: "Village Boundary Zone",
    radiusMeters: 2000,
  });
});

test("GPS risk analysis - returns no risk outside configured zones", () => {
  const strategy = new GpsRiskStrategy();

  const result = strategy.analyze({
    location: {
      latitude: 7.0001,
      longitude: 76.00001,
    },
    riskZones: [createZone()],
  });

  assert.deepEqual(result, {
    riskDetected: false,
    level: "NONE",
    type: null,
    message: "GPS reading is outside configured risk zones.",
    zoneId: null,
    distanceMeters: null,
    metadata: {},
  });
});

test("GPS risk analysis - uses risk-zone severity", () => {
  const strategy = new GpsRiskStrategy();

  const result = strategy.analyze({
    location: {
      latitude: 7.4,
      longitude: 80.7,
    },
    riskZones: [
      createZone({
        _id: "medium-zone",
        name: "Medium Risk Buffer Zone",
        center: {
          latitude: 7.4,
          longitude: 80.7,
        },
        radiusMeters: 1500,
        severity: "MEDIUM",
      }),
    ],
  });

  assert.equal(result.riskDetected, true);
  assert.equal(result.level, "MEDIUM");
  assert.equal(result.zoneId, "medium-zone");
});

test("GPS risk analysis - chooses nearest matching risk zone", () => {
  const strategy = new GpsRiskStrategy();

  const result = strategy.analyze({
    location: {
      latitude: 7.2906,
      longitude: 80.6337,
    },
    riskZones: [
      createZone({
        _id: "far-zone",
        name: "Far Zone",
        center: {
          latitude: 7.291,
          longitude: 80.634,
        },
        radiusMeters: 5000,
        severity: "MEDIUM",
      }),

      createZone({
        _id: "nearest-zone",
        name: "Nearest Zone",
        center: {
          latitude: 7.2906,
          longitude: 80.6337,
        },
        radiusMeters: 5000,
        severity: "CRITICAL",
      }),
    ],
  });

  assert.equal(result.riskDetected, true);
  assert.equal(result.zoneId, "nearest-zone");
  assert.equal(result.level, "CRITICAL");
  assert.equal(result.distanceMeters, 0);
});

test("GPS risk analysis - returns safe result when risk-zone list is empty", () => {
  const strategy = new GpsRiskStrategy();

  const result = strategy.analyze({
    location: {
      latitude: 7.2906,
      longitude: 80.6337,
    },
    riskZones: [],
  });

  assert.equal(result.riskDetected, false);
  assert.equal(result.level, "NONE");
});
