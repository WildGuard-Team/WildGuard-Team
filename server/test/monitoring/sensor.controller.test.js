import test from "node:test";
import assert from "node:assert/strict";

import * as sensorController from "../../src/modules/monitoring/controllers/sensor.controller.js";
import { sensorService } from "../../src/modules/monitoring/services/sensor.service.js";

function createResponse() {
  return {
    statusCode: 200,
    body: null,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test("Sensor controller - getSensors returns registered sensors", async () => {
  const original = sensorService.getSensors;

  sensorService.getSensors = async () => [
    {
      _id: "sensor-1",
      sensorId: "GPS-001",
    },
    {
      _id: "sensor-2",
      sensorId: "CAM-001",
    },
  ];

  try {
    const response = createResponse();

    await sensorController.getSensors({}, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);

    assert.equal(response.body.data.length, 2);
    assert.equal(response.body.data[0].sensorId, "GPS-001");
    assert.equal(response.body.data[1].sensorId, "CAM-001");
  } finally {
    sensorService.getSensors = original;
  }
});

test("Sensor controller - getSensors handles service error", async () => {
  const original = sensorService.getSensors;

  sensorService.getSensors = async () => {
    throw new Error("Unable to load sensors");
  };

  try {
    const response = createResponse();

    await sensorController.getSensors({}, response);

    assert.equal(response.statusCode, 400);

    assert.deepEqual(response.body, {
      success: false,
      message: "Unable to load sensors",
    });
  } finally {
    sensorService.getSensors = original;
  }
});

test("Sensor controller - createSensor returns 201", async () => {
  const original = sensorService.createSensor;

  sensorService.createSensor = async (body) => ({
    _id: "sensor-1",
    ...body,
    sensorId: String(body.sensorId).toUpperCase(),
  });

  try {
    const request = {
      body: {
        sensorId: "gps-001",
        name: "Elephant GPS Collar",
        type: "GPS_COLLAR",
      },
    };

    const response = createResponse();

    await sensorController.createSensor(request, response);

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.success, true);

    assert.equal(response.body.data._id, "sensor-1");
    assert.equal(response.body.data.sensorId, "GPS-001");
  } finally {
    sensorService.createSensor = original;
  }
});

test("Sensor controller - createSensor handles validation error", async () => {
  const original = sensorService.createSensor;

  sensorService.createSensor = async () => {
    throw new Error("Sensor ID already exists.");
  };

  try {
    const response = createResponse();

    await sensorController.createSensor(
      {
        body: {
          sensorId: "GPS-001",
        },
      },
      response,
    );

    assert.equal(response.statusCode, 400);

    assert.deepEqual(response.body, {
      success: false,
      message: "Sensor ID already exists.",
    });
  } finally {
    sensorService.createSensor = original;
  }
});

test("Sensor controller - updateSensor returns updated sensor", async () => {
  const original = sensorService.updateSensor;

  let receivedId = null;
  let receivedBody = null;

  sensorService.updateSensor = async (id, body) => {
    receivedId = id;
    receivedBody = body;

    return {
      _id: id,
      ...body,
    };
  };

  try {
    const request = {
      params: {
        id: "sensor-1",
      },

      body: {
        sensorId: "GPS-001",
        name: "Updated GPS Collar",
      },
    };

    const response = createResponse();

    await sensorController.updateSensor(request, response);

    assert.equal(response.statusCode, 200);

    assert.equal(receivedId, "sensor-1");

    assert.deepEqual(receivedBody, {
      sensorId: "GPS-001",
      name: "Updated GPS Collar",
    });

    assert.equal(response.body.data.name, "Updated GPS Collar");
  } finally {
    sensorService.updateSensor = original;
  }
});

test("Sensor controller - updateSensor handles missing sensor", async () => {
  const original = sensorService.updateSensor;

  sensorService.updateSensor = async () => {
    throw new Error("Sensor not found.");
  };

  try {
    const response = createResponse();

    await sensorController.updateSensor(
      {
        params: {
          id: "missing-sensor",
        },
        body: {},
      },
      response,
    );

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.message, "Sensor not found.");
  } finally {
    sensorService.updateSensor = original;
  }
});

test("Sensor controller - deleteSensor deletes registered sensor", async () => {
  const original = sensorService.deleteSensor;

  let deletedId = null;

  sensorService.deleteSensor = async (id) => {
    deletedId = id;

    return {
      _id: id,
      sensorId: "GPS-001",
    };
  };

  try {
    const response = createResponse();

    await sensorController.deleteSensor(
      {
        params: {
          id: "sensor-1",
        },
      },
      response,
    );

    assert.equal(deletedId, "sensor-1");
    assert.equal(response.statusCode, 200);

    assert.deepEqual(response.body, {
      success: true,
      data: {
        _id: "sensor-1",
        sensorId: "GPS-001",
      },
    });
  } finally {
    sensorService.deleteSensor = original;
  }
});

test("Sensor controller - deleteSensor handles missing sensor", async () => {
  const original = sensorService.deleteSensor;

  sensorService.deleteSensor = async () => {
    throw new Error("Sensor not found.");
  };

  try {
    const response = createResponse();

    await sensorController.deleteSensor(
      {
        params: {
          id: "missing-sensor",
        },
      },
      response,
    );

    assert.equal(response.statusCode, 400);

    assert.deepEqual(response.body, {
      success: false,
      message: "Sensor not found.",
    });
  } finally {
    sensorService.deleteSensor = original;
  }
});
