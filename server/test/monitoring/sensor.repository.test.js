import test from "node:test";
import assert from "node:assert/strict";

import { SensorRepository } from "../../src/modules/monitoring/repositories/sensor.repository.js";
import { Sensor } from "../../src/modules/monitoring/models/sensor.model.js";

test("Sensor repository - finds all sensors newest first", async () => {
  const original = Sensor.find;

  let sortValue = null;

  Sensor.find = () => ({
    sort(value) {
      sortValue = value;

      return {
        lean() {
          return [
            {
              sensorId: "GPS-001",
            },
          ];
        },
      };
    },
  });

  try {
    const repository = new SensorRepository();

    const result = await repository.findAll();

    assert.deepEqual(sortValue, {
      createdAt: -1,
    });

    assert.equal(result[0].sensorId, "GPS-001");
  } finally {
    Sensor.find = original;
  }
});

test("Sensor repository - finds sensor by database id", async () => {
  const original = Sensor.findById;

  Sensor.findById = async (id) => ({
    _id: id,
    sensorId: "GPS-001",
  });

  try {
    const repository = new SensorRepository();

    const result = await repository.findById("sensor-1");

    assert.equal(result._id, "sensor-1");
  } finally {
    Sensor.findById = original;
  }
});

test("Sensor repository - finds sensor by normalized sensor id", async () => {
  const original = Sensor.findOne;

  let receivedFilter = null;

  Sensor.findOne = async (filter) => {
    receivedFilter = filter;

    return {
      sensorId: filter.sensorId,
    };
  };

  try {
    const repository = new SensorRepository();

    const result = await repository.findBySensorId("gps-001");

    assert.deepEqual(receivedFilter, {
      sensorId: "GPS-001",
    });

    assert.equal(result.sensorId, "GPS-001");
  } finally {
    Sensor.findOne = original;
  }
});

test("Sensor repository - creates sensor", async () => {
  const original = Sensor.create;

  Sensor.create = async (data) => ({
    _id: "sensor-1",
    ...data,
  });

  try {
    const repository = new SensorRepository();

    const result = await repository.create({
      sensorId: "GPS-001",
      type: "GPS_COLLAR",
    });

    assert.equal(result._id, "sensor-1");
    assert.equal(result.type, "GPS_COLLAR");
  } finally {
    Sensor.create = original;
  }
});

test("Sensor repository - updates sensor by id", async () => {
  const original = Sensor.findByIdAndUpdate;

  let receivedId = null;
  let receivedUpdate = null;
  let receivedOptions = null;

  Sensor.findByIdAndUpdate = async (id, update, options) => {
    receivedId = id;
    receivedUpdate = update;
    receivedOptions = options;

    return {
      _id: id,
      ...update.$set,
    };
  };

  try {
    const repository = new SensorRepository();

    const result = await repository.updateById("sensor-1", {
      name: "Updated Sensor",
    });

    assert.equal(receivedId, "sensor-1");

    assert.deepEqual(receivedUpdate, {
      $set: {
        name: "Updated Sensor",
      },
    });

    assert.deepEqual(receivedOptions, {
      new: true,
      runValidators: true,
    });

    assert.equal(result.name, "Updated Sensor");
  } finally {
    Sensor.findByIdAndUpdate = original;
  }
});

test("Sensor repository - deletes sensor by id", async () => {
  const original = Sensor.findByIdAndDelete;

  Sensor.findByIdAndDelete = async (id) => ({
    _id: id,
    sensorId: "GPS-001",
  });

  try {
    const repository = new SensorRepository();

    const result = await repository.deleteById("sensor-1");

    assert.equal(result._id, "sensor-1");
    assert.equal(result.sensorId, "GPS-001");
  } finally {
    Sensor.findByIdAndDelete = original;
  }
});

test("Sensor repository - updates latest reading and normalizes sensor id", async () => {
  const original = Sensor.findOneAndUpdate;

  let receivedFilter = null;
  let receivedUpdate = null;
  let receivedOptions = null;

  Sensor.findOneAndUpdate = async (filter, update, options) => {
    receivedFilter = filter;
    receivedUpdate = update;
    receivedOptions = options;

    return {
      sensorId: filter.sensorId,
      ...update.$set,
    };
  };

  try {
    const repository = new SensorRepository();

    const location = {
      latitude: 7.35,
      longitude: 80.55,
    };

    const timestamp = new Date("2026-10-09T10:00:00.000Z");

    const result = await repository.updateLatestReading(
      "gps-001",
      location,
      timestamp,
    );

    assert.deepEqual(receivedFilter, {
      sensorId: "GPS-001",
    });

    assert.deepEqual(receivedUpdate, {
      $set: {
        location,
        lastSeenAt: timestamp,
      },
    });

    assert.deepEqual(receivedOptions, {
      new: true,
      runValidators: true,
    });

    assert.equal(result.sensorId, "GPS-001");
  } finally {
    Sensor.findOneAndUpdate = original;
  }
});

test("Sensor repository - sets sensor status", async () => {
  const original = Sensor.findOneAndUpdate;

  let receivedFilter = null;
  let receivedUpdate = null;

  Sensor.findOneAndUpdate = async (filter, update) => {
    receivedFilter = filter;
    receivedUpdate = update;

    return {
      sensorId: filter.sensorId,
      status: update.$set.status,
    };
  };

  try {
    const repository = new SensorRepository();

    const result = await repository.setStatus("GPS-001", "FAILED");

    assert.deepEqual(receivedFilter, {
      sensorId: "GPS-001",
    });

    assert.deepEqual(receivedUpdate, {
      $set: {
        status: "FAILED",
      },
    });

    assert.equal(result.status, "FAILED");
  } finally {
    Sensor.findOneAndUpdate = original;
  }
});

test("Sensor repository - counts sensors", async () => {
  const original = Sensor.countDocuments;

  let receivedFilter = null;

  Sensor.countDocuments = async (filter) => {
    receivedFilter = filter;
    return 3;
  };

  try {
    const repository = new SensorRepository();

    const result = await repository.count({
      status: "ACTIVE",
    });

    assert.deepEqual(receivedFilter, {
      status: "ACTIVE",
    });

    assert.equal(result, 3);
  } finally {
    Sensor.countDocuments = original;
  }
});
