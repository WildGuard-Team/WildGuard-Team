import test from "node:test";
import assert from "node:assert/strict";

import { ReadingValidationService } from "../../src/modules/monitoring/services/validation.service.js";

const FIXED_NOW = new Date("2026-10-09T10:00:00.000Z");

function createService() {
  return new ReadingValidationService({
    clock: () => FIXED_NOW,
  });
}

function createGpsSensor(overrides = {}) {
  return {
    sensorId: "GPS-001",
    type: "GPS_COLLAR",
    status: "ACTIVE",
    ...overrides,
  };
}

function createValidGpsInput(overrides = {}) {
  return {
    sensorId: "GPS-001",
    timestamp: new Date("2026-10-09T09:00:00.000Z"),
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

test("Reading validation - accepts valid GPS reading", () => {
  const service = createService();

  const result = service.validate(createValidGpsInput(), createGpsSensor());

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("Reading validation - rejects unknown sensor", () => {
  const service = createService();

  const result = service.validate(createValidGpsInput(), null);

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("UNKNOWN_SENSOR"));
});

test("Reading validation - rejects missing sensor ID", () => {
  const service = createService();

  const input = createValidGpsInput({
    sensorId: "",
  });

  const result = service.validate(input, createGpsSensor());

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("SENSOR_ID_REQUIRED"));
});

test("Reading validation - rejects missing timestamp", () => {
  const service = createService();

  const input = createValidGpsInput();

  delete input.timestamp;

  const result = service.validate(input, createGpsSensor());

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("INVALID_TIMESTAMP"));
});

test("Reading validation - rejects future timestamp", () => {
  const service = createService();

  const input = createValidGpsInput({
    timestamp: new Date("2026-10-09T11:00:00.000Z"),
  });

  const result = service.validate(input, createGpsSensor());

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("INVALID_TIMESTAMP"));
});

test("Reading validation - rejects missing location", () => {
  const service = createService();

  const input = createValidGpsInput({
    location: null,
  });

  const result = service.validate(input, createGpsSensor());

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("INVALID_COORDINATES"));
});

test("GPS coordinate bounds - rejects latitude greater than 90", () => {
  const service = createService();

  const input = createValidGpsInput({
    location: {
      latitude: 90.1,
      longitude: 80.6337,
    },
  });

  const result = service.validate(input, createGpsSensor());

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("INVALID_COORDINATES"));
});

test("GPS coordinate bounds - rejects latitude less than -90", () => {
  const service = createService();

  const input = createValidGpsInput({
    location: {
      latitude: -90.1,
      longitude: 80.6337,
    },
  });

  const result = service.validate(input, createGpsSensor());

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("INVALID_COORDINATES"));
});

test("GPS coordinate bounds - rejects longitude greater than 180", () => {
  const service = createService();

  const input = createValidGpsInput({
    location: {
      latitude: 7.2906,
      longitude: 180.1,
    },
  });

  const result = service.validate(input, createGpsSensor());

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("INVALID_COORDINATES"));
});

test("GPS coordinate bounds - rejects longitude less than -180", () => {
  const service = createService();

  const input = createValidGpsInput({
    location: {
      latitude: 7.2906,
      longitude: -180.1,
    },
  });

  const result = service.validate(input, createGpsSensor());

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("INVALID_COORDINATES"));
});

test("GPS coordinate bounds - accepts exact minimum and maximum boundaries", () => {
  const service = createService();

  const minimum = service.validate(
    createValidGpsInput({
      location: {
        latitude: -90,
        longitude: -180,
      },
    }),
    createGpsSensor(),
  );

  const maximum = service.validate(
    createValidGpsInput({
      location: {
        latitude: 90,
        longitude: 180,
      },
    }),
    createGpsSensor(),
  );

  assert.equal(minimum.valid, true);
  assert.equal(maximum.valid, true);
});

test("GPS validation - rejects invalid battery level", () => {
  const service = createService();

  const result = service.validate(
    createValidGpsInput({
      values: {
        batteryLevel: 101,
      },
    }),
    createGpsSensor(),
  );

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("INVALID_BATTERY_LEVEL"));
});

test("Reading validation - rejects inactive sensor", () => {
  const service = createService();

  const result = service.validate(
    createValidGpsInput(),
    createGpsSensor({
      status: "INACTIVE",
    }),
  );

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("SENSOR_NOT_ACTIVE"));
});

test("Reading validation - rejects unsupported sensor type", () => {
  const service = createService();

  const result = service.validate(
    createValidGpsInput(),
    createGpsSensor({
      type: "TEMPERATURE",
    }),
  );

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("UNSUPPORTED_SENSOR_TYPE"));
});

test("Reading validation - rejects invalid reading object", () => {
  const service = createService();

  const result = service.validate(null, createGpsSensor());

  assert.deepEqual(result, {
    valid: false,
    errors: ["INVALID_READING"],
  });
});
