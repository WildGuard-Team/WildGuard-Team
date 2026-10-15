import test from "node:test";
import assert from "node:assert/strict";

import { AlertService } from "../../src/modules/monitoring/services/alert.service.js";

function createRepository(overrides = {}) {
  return {
    create: async (data) => ({
      _id: "alert-1",
      ...data,
    }),

    resolveActiveAlertsForSensor: async (sensorId) => ({
      acknowledged: true,
      modifiedCount: 1,
      sensorId,
    }),

    ...overrides,
  };
}

function createRiskInput(overrides = {}) {
  return {
    sensor: {
      _id: "sensor-db-1",
      sensorId: "GPS-001",
      type: "GPS_COLLAR",
    },

    reading: {
      _id: "reading-1",
    },

    analysisDocument: {
      _id: "analysis-1",
    },

    riskResult: {
      riskDetected: true,
      level: "HIGH",
      type: "HIGH_RISK_ZONE_ENTRY",
      message: "Sensor entered high-risk zone.",
      zoneId: "zone-1",
      distanceMeters: 120,
      metadata: {},
    },

    location: {
      latitude: 7.2906,
      longitude: 80.6337,
    },

    ...overrides,
  };
}

test("Alert service - creates alert when risk is detected", async () => {
  let createdData = null;

  const repository = createRepository({
    create: async (data) => {
      createdData = data;

      return {
        _id: "alert-1",
        ...data,
      };
    },
  });

  const service = new AlertService(repository);

  const result = await service.createFromRisk(createRiskInput());

  assert.equal(result._id, "alert-1");

  assert.equal(createdData.readingId, "reading-1");

  assert.equal(createdData.analysisId, "analysis-1");

  assert.equal(createdData.sensorId, "GPS-001");

  assert.equal(createdData.type, "HIGH_RISK_ZONE_ENTRY");

  assert.equal(createdData.severity, "HIGH");

  assert.equal(createdData.message, "Sensor entered high-risk zone.");

  assert.deepEqual(createdData.location, {
    latitude: 7.2906,
    longitude: 80.6337,
  });

  assert.equal(createdData.status, "ACTIVE");

  assert.equal(createdData.resolvedAt, null);

  assert.equal(createdData.deliveryStatus, "PENDING");

  assert.equal(createdData.recipient, "RANGER_MANAGER");
});

test("Alert service - does not create alert when no risk is detected", async () => {
  let createCalled = false;

  const repository = createRepository({
    create: async () => {
      createCalled = true;
    },
  });

  const service = new AlertService(repository);

  const result = await service.createFromRisk(
    createRiskInput({
      riskResult: {
        riskDetected: false,
        level: "NONE",
        type: null,
        message: "No risk detected.",
      },
    }),
  );

  assert.equal(result, null);
  assert.equal(createCalled, false);
});

test("Alert service - creates alert using camera risk information", async () => {
  const repository = createRepository();

  const service = new AlertService(repository);

  const result = await service.createFromRisk(
    createRiskInput({
      sensor: {
        _id: "camera-db-1",
        sensorId: "CAM-001",
        type: "CAMERA_TRAP",
      },

      riskResult: {
        riskDetected: true,
        level: "HIGH",
        type: "HUMAN_DETECTED",
        message: "High-confidence human detection recorded by camera trap.",
      },
    }),
  );

  assert.equal(result.sensorId, "CAM-001");

  assert.equal(result.type, "HUMAN_DETECTED");

  assert.equal(result.severity, "HIGH");

  assert.equal(result.deliveryStatus, "PENDING");

  assert.equal(result.status, "ACTIVE");
});

test("Alert service - resolves active alerts for sensor", async () => {
  let resolvedSensorId = null;

  const repository = createRepository({
    resolveActiveAlertsForSensor: async (sensorId) => {
      resolvedSensorId = sensorId;

      return {
        acknowledged: true,
        modifiedCount: 2,
      };
    },
  });

  const service = new AlertService(repository);

  const result = await service.resolveSensorAlerts("GPS-001");

  assert.equal(resolvedSensorId, "GPS-001");

  assert.equal(result.acknowledged, true);

  assert.equal(result.modifiedCount, 2);
});

test("Alert service - returns repository result when no active alerts need resolving", async () => {
  const repository = createRepository({
    resolveActiveAlertsForSensor: async () => ({
      acknowledged: true,
      modifiedCount: 0,
    }),
  });

  const service = new AlertService(repository);

  const result = await service.resolveSensorAlerts("GPS-999");

  assert.equal(result.modifiedCount, 0);
});
