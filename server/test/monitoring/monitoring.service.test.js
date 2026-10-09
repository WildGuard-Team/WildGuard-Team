import test from "node:test";
import assert from "node:assert/strict";

import { MonitoringService } from "../../src/modules/monitoring/services/monitoring.service.js";

const FIXED_NOW = new Date("2026-10-09T10:00:00.000Z");

function createSensor(overrides = {}) {
  return {
    _id: "sensor-db-1",
    sensorId: "GPS-001",
    type: "GPS_COLLAR",
    status: "ACTIVE",
    ...overrides,
  };
}

function createInput(overrides = {}) {
  return {
    sensorId: "gps-001",
    timestamp: "2026-10-09T09:00:00.000Z",
    location: {
      latitude: 7.2906,
      longitude: 80.6337,
    },
    values: {
      batteryLevel: 85,
    },
    ...overrides,
  };
}

function createDependencies(overrides = {}) {
  const calls = {
    received: [],
    validated: [],
    analyzed: [],
    rejected: [],
    noAlert: [],
    alertCreated: [],
    failed: [],
    createdReadings: [],
    createdAnalyses: [],
    resolvedSensors: [],
    deliveredAlerts: [],
    markProcessed: [],
    markFailed: [],
    updatedSensors: [],
  };

  const sensor = createSensor();

  const dependencies = {
    sensors: {
      findBySensorId: async () => sensor,

      updateLatestReading: async (sensorId, location, timestamp) => {
        calls.updatedSensors.push({
          sensorId,
          location,
          timestamp,
        });

        return {
          ...sensor,
          location,
          lastSeenAt: timestamp,
        };
      },
    },

    readings: {
      create: async (data) => {
        calls.createdReadings.push(data);

        return {
          _id: "reading-1",
          ...data,
        };
      },

      markProcessed: async (id) => {
        calls.markProcessed.push(id);

        return {
          _id: id,
          processingStatus: "PROCESSED",
        };
      },

      markFailed: async (id, message) => {
        calls.markFailed.push({
          id,
          message,
        });

        return {
          _id: id,
          processingStatus: "PROCESSING_FAILED",
        };
      },
    },

    analyses: {
      create: async (data) => {
        calls.createdAnalyses.push(data);

        return {
          _id: "analysis-1",
          ...data,
        };
      },
    },

    validator: {
      validate: () => ({
        valid: true,
        errors: [],
      }),
    },

    riskAnalyzer: {
      analyze: async () => ({
        riskDetected: false,
        level: "NONE",
        type: null,
        message: "No risk detected.",
        zoneId: null,
        distanceMeters: null,
        metadata: {},
      }),
    },

    alerts: {
      resolveSensorAlerts: async (sensorId) => {
        calls.resolvedSensors.push(sensorId);
      },

      createFromRisk: async () => ({
        _id: "alert-1",
        sensorId: "GPS-001",
        severity: "HIGH",
        deliveryStatus: "PENDING",
      }),
    },

    delivery: {
      deliver: async (alert) => {
        calls.deliveredAlerts.push(alert);

        return {
          ...alert,
          deliveryStatus: "DELIVERED",
        };
      },
    },

    logs: {
      received: async (...args) => {
        calls.received.push(args);
      },

      validated: async (...args) => {
        calls.validated.push(args);
      },

      analyzed: async (...args) => {
        calls.analyzed.push(args);
      },

      rejected: async (...args) => {
        calls.rejected.push(args);
      },

      noAlert: async (...args) => {
        calls.noAlert.push(args);
      },

      alertCreated: async (...args) => {
        calls.alertCreated.push(args);
      },

      failed: async (...args) => {
        calls.failed.push(args);
      },
    },

    factory: {
      createValid: (data) => ({
        ...data,
        validationStatus: "VALID",
        processingStatus: "PENDING",
      }),

      createRejected: (data) => ({
        ...data,
        validationStatus: "REJECTED",
        processingStatus: "REJECTED",
      }),
    },

    clock: () => FIXED_NOW,
  };

  return {
    calls,
    dependencies: {
      ...dependencies,
      ...overrides,
    },
  };
}

test("Monitoring service - stores and processes valid safe reading", async () => {
  const { dependencies, calls } = createDependencies();

  const service = new MonitoringService(dependencies);

  const result = await service.processReading(createInput());

  assert.equal(calls.createdReadings.length, 1);

  assert.equal(calls.createdAnalyses.length, 1);

  assert.deepEqual(calls.markProcessed, ["reading-1"]);

  assert.equal(calls.updatedSensors.length, 1);

  assert.equal(result.reading.processingStatus, "PROCESSED");

  assert.equal(result.alert, null);
});

test("Monitoring service - normalizes sensor ID before processing", async () => {
  const { dependencies, calls } = createDependencies();

  const service = new MonitoringService(dependencies);

  await service.processReading(
    createInput({
      sensorId: "  gps-001  ",
    }),
  );

  assert.equal(calls.received[0][0], "GPS-001");
});

test("Monitoring service - logs each valid processing stage", async () => {
  const { dependencies, calls } = createDependencies();

  const service = new MonitoringService(dependencies);

  await service.processReading(createInput());

  assert.equal(calls.received.length, 1);
  assert.equal(calls.validated.length, 1);
  assert.equal(calls.analyzed.length, 1);
  assert.equal(calls.noAlert.length, 1);

  assert.equal(calls.alertCreated.length, 0);
});

test("Monitoring service - resolves active alerts when reading becomes safe", async () => {
  const { dependencies, calls } = createDependencies();

  const service = new MonitoringService(dependencies);

  await service.processReading(createInput());

  assert.deepEqual(calls.resolvedSensors, ["GPS-001"]);

  assert.equal(calls.noAlert.length, 1);
});

test("Monitoring service - creates and delivers alert when risk is detected", async () => {
  const riskResult = {
    riskDetected: true,
    level: "HIGH",
    type: "HIGH_RISK_ZONE_ENTRY",
    message: "Sensor entered risk zone.",
    zoneId: "zone-1",
    distanceMeters: 100,
    metadata: {
      zoneName: "Risk Zone",
    },
  };

  const { dependencies, calls } = createDependencies({
    riskAnalyzer: {
      analyze: async () => riskResult,
    },
  });

  const service = new MonitoringService(dependencies);

  const result = await service.processReading(createInput());

  assert.equal(calls.createdAnalyses.length, 1);

  assert.equal(calls.createdAnalyses[0].riskDetected, true);

  assert.equal(calls.createdAnalyses[0].riskLevel, "HIGH");

  assert.equal(calls.alertCreated.length, 1);

  assert.equal(calls.deliveredAlerts.length, 1);

  assert.equal(result.alert.deliveryStatus, "DELIVERED");

  assert.equal(calls.noAlert.length, 0);
});

test("Monitoring service - stores rejected reading when validation fails", async () => {
  const validator = {
    validate: () => ({
      valid: false,
      errors: ["INVALID_COORDINATES"],
    }),
  };

  const { dependencies, calls } = createDependencies({
    validator,
  });

  const service = new MonitoringService(dependencies);

  const result = await service.processReading(
    createInput({
      location: null,
    }),
  );

  assert.equal(calls.createdReadings.length, 1);

  assert.equal(calls.createdReadings[0].validationStatus, "REJECTED");

  assert.deepEqual(calls.createdReadings[0].rejectionReasons, [
    "INVALID_COORDINATES",
  ]);

  assert.equal(calls.rejected.length, 1);

  assert.equal(result.analysis, null);
  assert.equal(result.alert, null);
});

test("Monitoring service - rejected unknown sensor uses null sensor type", async () => {
  const sensors = {
    findBySensorId: async () => null,

    updateLatestReading: async () => {
      throw new Error("Should not update sensor");
    },
  };

  const validator = {
    validate: () => ({
      valid: false,
      errors: ["UNKNOWN_SENSOR"],
    }),
  };

  const { dependencies, calls } = createDependencies({
    sensors,
    validator,
  });

  const service = new MonitoringService(dependencies);

  const result = await service.processReading(
    createInput({
      sensorId: "unknown-001",
    }),
  );

  assert.equal(result.sensor, null);

  assert.equal(calls.createdReadings[0].sensorType, null);

  assert.deepEqual(calls.createdReadings[0].rejectionReasons, [
    "UNKNOWN_SENSOR",
  ]);
});

test("Monitoring service - missing sensor ID is logged as null", async () => {
  const sensors = {
    findBySensorId: async () => {
      throw new Error("findBySensorId should not run");
    },
  };

  const validator = {
    validate: () => ({
      valid: false,
      errors: ["SENSOR_ID_REQUIRED", "UNKNOWN_SENSOR"],
    }),
  };

  const { dependencies, calls } = createDependencies({
    sensors,
    validator,
  });

  const service = new MonitoringService(dependencies);

  await service.processReading(
    createInput({
      sensorId: "",
    }),
  );

  assert.equal(calls.received[0][0], null);

  assert.equal(calls.rejected[0][0], null);

  assert.equal(calls.createdReadings[0].sensorId, "UNKNOWN");
});

test("Monitoring service - uses clock when timestamp is missing", async () => {
  const { dependencies, calls } = createDependencies();

  const service = new MonitoringService(dependencies);

  const input = createInput();

  delete input.timestamp;

  await service.processReading(input);

  assert.equal(
    calls.createdReadings[0].timestamp.getTime(),
    FIXED_NOW.getTime(),
  );
});

test("Monitoring service - accepts recordedAt as timestamp fallback", async () => {
  const { dependencies, calls } = createDependencies();

  const service = new MonitoringService(dependencies);

  const input = createInput({
    timestamp: undefined,
    recordedAt: "2026-10-09T08:30:00.000Z",
  });

  await service.processReading(input);

  assert.equal(
    calls.createdReadings[0].timestamp.toISOString(),
    "2026-10-09T08:30:00.000Z",
  );
});

test("Monitoring service - preserves invalid timestamp for validator", async () => {
  let validatedInput = null;

  const validator = {
    validate: (input) => {
      validatedInput = input;

      return {
        valid: false,
        errors: ["INVALID_TIMESTAMP"],
      };
    },
  };

  const { dependencies } = createDependencies({
    validator,
  });

  const service = new MonitoringService(dependencies);

  await service.processReading(
    createInput({
      timestamp: "not-a-date",
    }),
  );

  assert.equal(validatedInput.timestamp, "not-a-date");
});

test("Monitoring service - marks reading failed and logs unexpected processing error", async () => {
  const riskAnalyzer = {
    analyze: async () => {
      throw new Error("Risk analysis failed");
    },
  };

  const { dependencies, calls } = createDependencies({
    riskAnalyzer,
  });

  const service = new MonitoringService(dependencies);

  await assert.rejects(() => service.processReading(createInput()), {
    message: "Risk analysis failed",
  });

  assert.deepEqual(calls.markFailed, [
    {
      id: "reading-1",
      message: "Risk analysis failed",
    },
  ]);

  assert.equal(calls.failed.length, 1);

  assert.equal(calls.failed[0][0], "GPS-001");

  assert.equal(calls.failed[0][1], "reading-1");
});

test("Monitoring service - logs failure without marking reading when error happens before reading creation", async () => {
  const readings = {
    create: async () => {
      throw new Error("Database unavailable");
    },

    markProcessed: async () => null,

    markFailed: async () => {
      throw new Error("Should not mark failed");
    },
  };

  const { dependencies, calls } = createDependencies({
    readings,
  });

  const service = new MonitoringService(dependencies);

  await assert.rejects(() => service.processReading(createInput()), {
    message: "Database unavailable",
  });

  assert.equal(calls.markFailed.length, 0);

  assert.equal(calls.failed.length, 1);

  assert.equal(calls.failed[0][1], null);
});

test("Monitoring service - preserves original error if marking failed also fails", async () => {
  const riskAnalyzer = {
    analyze: async () => {
      throw new Error("Original processing error");
    },
  };

  const readings = {
    create: async (data) => ({
      _id: "reading-1",
      ...data,
    }),

    markProcessed: async () => null,

    markFailed: async () => {
      throw new Error("Secondary mark failed error");
    },
  };

  const { dependencies, calls } = createDependencies({
    riskAnalyzer,
    readings,
  });

  const service = new MonitoringService(dependencies);

  await assert.rejects(() => service.processReading(createInput()), {
    message: "Original processing error",
  });

  assert.equal(calls.failed.length, 1);
});

test("Monitoring service - preserves original error if failure logging also fails", async () => {
  const riskAnalyzer = {
    analyze: async () => {
      throw new Error("Original failure");
    },
  };

  const { dependencies } = createDependencies();

  dependencies.riskAnalyzer = riskAnalyzer;

  dependencies.logs.failed = async () => {
    throw new Error("Logging failure");
  };

  const service = new MonitoringService(dependencies);

  await assert.rejects(() => service.processReading(createInput()), {
    message: "Original failure",
  });
});
