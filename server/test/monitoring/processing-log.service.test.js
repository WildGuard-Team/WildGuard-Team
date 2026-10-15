import test from "node:test";
import assert from "node:assert/strict";

import { ProcessingLogService } from "../../src/modules/monitoring/services/processing-log.service.js";

function createRepository() {
  const calls = [];

  return {
    calls,

    repository: {
      create: async (data) => {
        calls.push(data);

        return {
          _id: `log-${calls.length}`,
          ...data,
        };
      },
    },
  };
}

test("Processing log service - creates raw log", async () => {
  const { repository, calls } = createRepository();

  const service = new ProcessingLogService(repository);

  const result = await service.create({
    sensorId: "GPS-001",
    event: "CUSTOM",
  });

  assert.equal(calls.length, 1);
  assert.equal(result.sensorId, "GPS-001");
  assert.equal(result.event, "CUSTOM");
});

test("Processing log service - logs received reading", async () => {
  const { repository, calls } = createRepository();

  const service = new ProcessingLogService(repository);

  await service.received("GPS-001");

  assert.deepEqual(calls[0], {
    sensorId: "GPS-001",
    event: "READING_RECEIVED",
    level: "INFO",
    message: "Sensor reading received.",
    details: {},
  });
});

test("Processing log service - logs validated reading", async () => {
  const { repository, calls } = createRepository();

  const service = new ProcessingLogService(repository);

  await service.validated("GPS-001", "reading-1");

  assert.deepEqual(calls[0], {
    sensorId: "GPS-001",
    readingId: "reading-1",
    event: "READING_VALIDATED",
    level: "INFO",
    message: "Sensor reading validation completed successfully.",
    details: {},
  });
});

test("Processing log service - logs rejected reading", async () => {
  const { repository, calls } = createRepository();

  const service = new ProcessingLogService(repository);

  await service.rejected("GPS-001", "reading-1", ["INVALID_COORDINATES"]);

  assert.deepEqual(calls[0], {
    sensorId: "GPS-001",
    readingId: "reading-1",
    event: "READING_REJECTED",
    level: "WARNING",
    message: "Sensor reading was rejected.",

    details: {
      reasons: ["INVALID_COORDINATES"],
    },
  });
});

test("Processing log service - logs risky analysis as warning", async () => {
  const { repository, calls } = createRepository();

  const service = new ProcessingLogService(repository);

  await service.analyzed("GPS-001", "reading-1", {
    riskDetected: true,
    level: "HIGH",
    type: "HIGH_RISK_ZONE_ENTRY",
    message: "Sensor entered risk zone.",
    zoneId: "zone-1",
    distanceMeters: 100,
  });

  assert.equal(calls[0].event, "RISK_ANALYSIS_COMPLETED");
  assert.equal(calls[0].level, "WARNING");

  assert.deepEqual(calls[0].details, {
    riskDetected: true,
    riskLevel: "HIGH",
    riskType: "HIGH_RISK_ZONE_ENTRY",
    zoneId: "zone-1",
    distanceMeters: 100,
  });
});

test("Processing log service - logs safe analysis as info", async () => {
  const { repository, calls } = createRepository();

  const service = new ProcessingLogService(repository);

  await service.analyzed("GPS-001", "reading-1", {
    riskDetected: false,
    level: "NONE",
    type: null,
    message: "GPS reading is outside configured risk zones.",
    zoneId: null,
    distanceMeters: null,
  });

  assert.equal(calls[0].level, "INFO");

  assert.equal(calls[0].details.riskDetected, false);

  assert.equal(calls[0].details.riskLevel, "NONE");
});

test("Processing log service - logs alert creation", async () => {
  const { repository, calls } = createRepository();

  const service = new ProcessingLogService(repository);

  await service.alertCreated("GPS-001", "reading-1", "alert-1");

  assert.deepEqual(calls[0], {
    sensorId: "GPS-001",
    readingId: "reading-1",
    alertId: "alert-1",

    event: "ALERT_CREATED",
    level: "WARNING",
    message: "Risk alert created.",
    details: {},
  });
});

test("Processing log service - logs when no alert is required", async () => {
  const { repository, calls } = createRepository();

  const service = new ProcessingLogService(repository);

  await service.noAlert("GPS-001", "reading-1");

  assert.deepEqual(calls[0], {
    sensorId: "GPS-001",
    readingId: "reading-1",

    event: "NO_ALERT_REQUIRED",
    level: "INFO",
    message: "No alert was required.",
    details: {},
  });
});

test("Processing log service - logs processing failure using error message", async () => {
  const { repository, calls } = createRepository();

  const service = new ProcessingLogService(repository);

  await service.failed(
    "GPS-001",
    "reading-1",
    new Error("Risk analysis failed"),
  );

  assert.deepEqual(calls[0], {
    sensorId: "GPS-001",
    readingId: "reading-1",

    event: "PROCESSING_FAILED",
    level: "ERROR",
    message: "Risk analysis failed",
    details: {},
  });
});
test("Processing log service - uses fallback failure message", async () => {
  const { repository, calls } = createRepository();

  const service = new ProcessingLogService(repository);

  await service.failed("GPS-001", "reading-1", null);

  assert.equal(calls[0].message, "Reading processing failed.");

  assert.equal(calls[0].level, "ERROR");
});
