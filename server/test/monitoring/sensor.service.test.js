import test from "node:test";
import assert from "node:assert/strict";

import { SensorService } from "../../src/modules/monitoring/services/sensor.service.js";

function createRepository(overrides = {}) {
  return {
    findAll: async () => [],
    findBySensorId: async () => null,
    create: async (data) => ({
      _id: "sensor-db-1",
      ...data,
    }),
    updateById: async (id, data) => ({
      _id: id,
      ...data,
    }),
    deleteById: async (id) => ({
      _id: id,
      sensorId: "GPS-001",
    }),
    ...overrides,
  };
}

function createValidInput(overrides = {}) {
  return {
    sensorId: "gps-001",
    name: "Elephant GPS Collar",
    type: "GPS_COLLAR",
    status: "ACTIVE",
    animalId: "ELE-001",
    expectedIntervalMinutes: 30,
    location: {
      latitude: 7.2906,
      longitude: 80.6337,
    },
    ...overrides,
  };
}

test("Sensor registry - returns all registered sensors", async () => {
  const expected = [
    {
      _id: "sensor-1",
      sensorId: "GPS-001",
    },
    {
      _id: "sensor-2",
      sensorId: "CAM-001",
    },
  ];

  const repository = createRepository({
    findAll: async () => expected,
  });

  const service = new SensorService(repository);

  const result = await service.getSensors();

  assert.deepEqual(result, expected);
});

test("Sensor registry - creates a valid sensor", async () => {
  let createdData = null;

  const repository = createRepository({
    create: async (data) => {
      createdData = data;

      return {
        _id: "sensor-1",
        ...data,
      };
    },
  });

  const service = new SensorService(repository);

  const result = await service.createSensor(createValidInput());

  assert.equal(result._id, "sensor-1");

  // sensor ID must be normalized to uppercase
  assert.equal(result.sensorId, "GPS-001");

  assert.equal(result.name, "Elephant GPS Collar");
  assert.equal(result.type, "GPS_COLLAR");
  assert.equal(result.status, "ACTIVE");
  assert.equal(result.animalId, "ELE-001");
  assert.equal(result.expectedIntervalMinutes, 30);

  assert.deepEqual(result.location, {
    latitude: 7.2906,
    longitude: 80.6337,
  });

  assert.equal(createdData.sensorId, "GPS-001");
});

test("Sensor registry - defaults status to ACTIVE", async () => {
  const repository = createRepository();

  const service = new SensorService(repository);

  const result = await service.createSensor(
    createValidInput({
      status: undefined,
    }),
  );

  assert.equal(result.status, "ACTIVE");
});

test("Sensor registry - converts blank animal ID to null", async () => {
  const repository = createRepository();

  const service = new SensorService(repository);

  const result = await service.createSensor(
    createValidInput({
      animalId: "   ",
    }),
  );

  assert.equal(result.animalId, null);
});

test("Sensor registry - rejects duplicate sensor ID", async () => {
  const repository = createRepository({
    findBySensorId: async () => ({
      _id: "existing-sensor",
      sensorId: "GPS-001",
    }),
  });

  const service = new SensorService(repository);

  await assert.rejects(() => service.createSensor(createValidInput()), {
    message: "Sensor ID already exists.",
  });
});

test("Sensor registry - rejects missing sensor ID", async () => {
  const service = new SensorService(createRepository());

  await assert.rejects(
    () =>
      service.createSensor(
        createValidInput({
          sensorId: "",
        }),
      ),
    {
      message: "Sensor ID is required.",
    },
  );
});

test("Sensor registry - rejects missing sensor name", async () => {
  const service = new SensorService(createRepository());

  await assert.rejects(
    () =>
      service.createSensor(
        createValidInput({
          name: "   ",
        }),
      ),
    {
      message: "Sensor name is required.",
    },
  );
});

test("Sensor registry - rejects invalid sensor type", async () => {
  const service = new SensorService(createRepository());

  await assert.rejects(
    () =>
      service.createSensor(
        createValidInput({
          type: "TEMPERATURE",
        }),
      ),
    {
      message: "Invalid sensor type.",
    },
  );
});

test("Sensor registry - rejects invalid sensor status", async () => {
  const service = new SensorService(createRepository());

  await assert.rejects(
    () =>
      service.createSensor(
        createValidInput({
          status: "BROKEN",
        }),
      ),
    {
      message: "Invalid sensor status.",
    },
  );
});

test("Sensor registry - rejects zero expected interval", async () => {
  const service = new SensorService(createRepository());

  await assert.rejects(
    () =>
      service.createSensor(
        createValidInput({
          expectedIntervalMinutes: 0,
        }),
      ),
    {
      message: "Expected interval must be a positive integer.",
    },
  );
});

test("Sensor registry - rejects decimal expected interval", async () => {
  const service = new SensorService(createRepository());

  await assert.rejects(
    () =>
      service.createSensor(
        createValidInput({
          expectedIntervalMinutes: 10.5,
        }),
      ),
    {
      message: "Expected interval must be a positive integer.",
    },
  );
});

test("Sensor registry - updates registered sensor", async () => {
  let updatedId = null;
  let updatedData = null;

  const repository = createRepository({
    findBySensorId: async () => ({
      _id: "sensor-1",
      sensorId: "GPS-001",
    }),

    updateById: async (id, data) => {
      updatedId = id;
      updatedData = data;

      return {
        _id: id,
        ...data,
      };
    },
  });

  const service = new SensorService(repository);

  const result = await service.updateSensor(
    "sensor-1",
    createValidInput({
      name: "Updated GPS Collar",
      expectedIntervalMinutes: 45,
    }),
  );

  assert.equal(updatedId, "sensor-1");
  assert.equal(updatedData.name, "Updated GPS Collar");
  assert.equal(updatedData.expectedIntervalMinutes, 45);

  assert.equal(result.name, "Updated GPS Collar");
});

test("Sensor registry - allows update when sensor ID belongs to same sensor", async () => {
  const repository = createRepository({
    findBySensorId: async () => ({
      _id: "sensor-1",
      sensorId: "GPS-001",
    }),
  });

  const service = new SensorService(repository);

  const result = await service.updateSensor("sensor-1", createValidInput());

  assert.equal(result._id, "sensor-1");
  assert.equal(result.sensorId, "GPS-001");
});

test("Sensor registry - rejects duplicate ID during update", async () => {
  const repository = createRepository({
    findBySensorId: async () => ({
      _id: "another-sensor",
      sensorId: "GPS-001",
    }),
  });

  const service = new SensorService(repository);

  await assert.rejects(
    () => service.updateSensor("sensor-1", createValidInput()),
    {
      message: "Sensor ID already exists.",
    },
  );
});

test("Sensor registry - rejects update when sensor does not exist", async () => {
  const repository = createRepository({
    updateById: async () => null,
  });

  const service = new SensorService(repository);

  await assert.rejects(
    () => service.updateSensor("missing-sensor", createValidInput()),
    {
      message: "Sensor not found.",
    },
  );
});

test("Sensor registry - deletes registered sensor", async () => {
  let deletedId = null;

  const repository = createRepository({
    deleteById: async (id) => {
      deletedId = id;

      return {
        _id: id,
        sensorId: "GPS-001",
      };
    },
  });

  const service = new SensorService(repository);

  const result = await service.deleteSensor("sensor-1");

  assert.equal(deletedId, "sensor-1");
  assert.equal(result._id, "sensor-1");
  assert.equal(result.sensorId, "GPS-001");
});

test("Sensor registry - rejects delete when sensor does not exist", async () => {
  const repository = createRepository({
    deleteById: async () => null,
  });

  const service = new SensorService(repository);

  await assert.rejects(() => service.deleteSensor("missing-sensor"), {
    message: "Sensor not found.",
  });
});
