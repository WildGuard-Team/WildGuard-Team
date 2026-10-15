import test from "node:test";
import assert from "node:assert/strict";

import { ReadingFactory } from "../../src/modules/monitoring/factories/reading.factory.js";

test("Reading factory - creates valid GPS reading", () => {
  const factory = new ReadingFactory();

  const timestamp = new Date("2026-10-09T10:00:00.000Z");

  const result = factory.createValid({
    sensor: {
      sensorId: "GPS-001",
      type: "GPS_COLLAR",
    },

    location: {
      latitude: 7.2906,
      longitude: 80.6337,
    },

    values: {
      batteryLevel: 85,
    },

    rawData: {
      sensorId: "GPS-001",
      values: {
        batteryLevel: 85,
      },
    },

    timestamp,
  });

  assert.deepEqual(result, {
    sensorId: "GPS-001",
    sensorType: "GPS_COLLAR",
    timestamp,

    location: {
      latitude: 7.2906,
      longitude: 80.6337,
    },

    values: {
      batteryLevel: 85,
    },

    rawData: {
      sensorId: "GPS-001",
      values: {
        batteryLevel: 85,
      },
    },

    validationStatus: "VALID",
    processingStatus: "PENDING",
    rejectionReasons: [],
    failureReason: null,
  });
});

test("Reading factory - creates valid camera trap reading", () => {
  const factory = new ReadingFactory();

  const timestamp = new Date("2026-10-09T10:00:00.000Z");

  const result = factory.createValid({
    sensor: {
      sensorId: "CAM-001",
      type: "CAMERA_TRAP",
    },

    location: {
      latitude: 7.4,
      longitude: 80.7,
    },

    values: {
      detection: "ELEPHANT",
      confidence: 0.9,
    },

    rawData: {
      sensorId: "CAM-001",
    },

    timestamp,
  });

  assert.equal(result.sensorId, "CAM-001");
  assert.equal(result.sensorType, "CAMERA_TRAP");

  assert.deepEqual(result.values, {
    detection: "ELEPHANT",
    confidence: 0.9,
  });

  assert.equal(result.validationStatus, "VALID");
  assert.equal(result.processingStatus, "PENDING");

  assert.deepEqual(result.rejectionReasons, []);
  assert.equal(result.failureReason, null);
});

test("Reading factory - creates rejected reading with reasons", () => {
  const factory = new ReadingFactory();

  const timestamp = new Date("2026-10-09T10:00:00.000Z");

  const result = factory.createRejected({
    sensorId: "GPS-001",
    sensorType: "GPS_COLLAR",

    location: {
      latitude: 100,
      longitude: 80.6337,
    },

    values: {
      batteryLevel: 85,
    },

    rawData: {
      sensorId: "GPS-001",
    },

    timestamp,

    rejectionReasons: ["INVALID_COORDINATES"],
  });

  assert.deepEqual(result, {
    sensorId: "GPS-001",
    sensorType: "GPS_COLLAR",
    timestamp,

    location: {
      latitude: 100,
      longitude: 80.6337,
    },

    values: {
      batteryLevel: 85,
    },

    rawData: {
      sensorId: "GPS-001",
    },

    validationStatus: "REJECTED",
    processingStatus: "REJECTED",

    rejectionReasons: ["INVALID_COORDINATES"],

    failureReason: null,
  });
});

test("Reading factory - rejected reading uses default sensor type, location and values", () => {
  const factory = new ReadingFactory();

  const timestamp = new Date("2026-10-09T10:00:00.000Z");

  const result = factory.createRejected({
    sensorId: "UNKNOWN",

    rawData: {
      sensorId: "",
    },

    timestamp,

    rejectionReasons: ["SENSOR_ID_REQUIRED", "UNKNOWN_SENSOR"],
  });

  assert.equal(result.sensorId, "UNKNOWN");
  assert.equal(result.sensorType, null);

  assert.equal(result.location, null);

  assert.deepEqual(result.values, {});

  assert.equal(result.validationStatus, "REJECTED");
  assert.equal(result.processingStatus, "REJECTED");

  assert.deepEqual(result.rejectionReasons, [
    "SENSOR_ID_REQUIRED",
    "UNKNOWN_SENSOR",
  ]);

  assert.equal(result.failureReason, null);
});

test("Reading factory - preserves raw data reference values", () => {
  const factory = new ReadingFactory();

  const rawData = {
    sensorId: "GPS-002",

    location: {
      latitude: 7.35,
      longitude: 80.55,
    },

    values: {
      batteryLevel: 70,
    },
  };

  const result = factory.createValid({
    sensor: {
      sensorId: "GPS-002",
      type: "GPS_COLLAR",
    },

    location: rawData.location,
    values: rawData.values,
    rawData,

    timestamp: new Date("2026-10-09T10:00:00.000Z"),
  });

  assert.equal(result.rawData, rawData);
  assert.equal(result.location, rawData.location);
  assert.equal(result.values, rawData.values);
});
