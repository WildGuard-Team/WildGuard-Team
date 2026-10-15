import test from "node:test";
import assert from "node:assert/strict";

import * as monitoringController from "../../src/modules/monitoring/controllers/monitoring.controller.js";
import { monitoringService } from "../../src/modules/monitoring/services/monitoring.service.js";
import { monitoringQueryService } from "../../src/modules/monitoring/services/monitoring-query.service.js";
import { sensorHealthService } from "../../src/modules/monitoring/services/sensor-health.service.js";

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

test("Monitoring controller - simulateReading returns 201 with processed result", async () => {
  const original = monitoringService.processReading;

  monitoringService.processReading = async (body) => ({
    reading: {
      _id: "reading-1",
    },
    input: body,
  });

  try {
    const request = {
      body: {
        sensorId: "GPS-001",
      },
    };

    const response = createResponse();

    await monitoringController.simulateReading(request, response);

    assert.equal(response.statusCode, 201);

    assert.equal(response.body.success, true);
    assert.equal(response.body.data.reading._id, "reading-1");
    assert.equal(response.body.data.input.sensorId, "GPS-001");
  } finally {
    monitoringService.processReading = original;
  }
});

test("Monitoring controller - simulateReading returns 400 on service error", async () => {
  const original = monitoringService.processReading;

  monitoringService.processReading = async () => {
    throw new Error("Simulation failed");
  };

  try {
    const response = createResponse();

    await monitoringController.simulateReading(
      {
        body: {},
      },
      response,
    );

    assert.equal(response.statusCode, 400);

    assert.deepEqual(response.body, {
      success: false,
      message: "Simulation failed",
    });
  } finally {
    monitoringService.processReading = original;
  }
});

test("Monitoring controller - getReadings returns readings", async () => {
  const original = monitoringQueryService.getReadings;

  monitoringQueryService.getReadings = async () => [
    {
      _id: "reading-1",
      sensorId: "GPS-001",
    },
  ];

  try {
    const response = createResponse();

    await monitoringController.getReadings({}, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);

    assert.deepEqual(response.body.data, [
      {
        _id: "reading-1",
        sensorId: "GPS-001",
      },
    ]);
  } finally {
    monitoringQueryService.getReadings = original;
  }
});

test("Monitoring controller - getReadings handles query error", async () => {
  const original = monitoringQueryService.getReadings;

  monitoringQueryService.getReadings = async () => {
    throw new Error("Unable to load readings");
  };

  try {
    const response = createResponse();

    await monitoringController.getReadings({}, response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.message, "Unable to load readings");
  } finally {
    monitoringQueryService.getReadings = original;
  }
});

test("Monitoring controller - getAlerts returns alerts", async () => {
  const original = monitoringQueryService.getAlerts;

  monitoringQueryService.getAlerts = async () => [
    {
      _id: "alert-1",
      severity: "HIGH",
    },
  ];

  try {
    const response = createResponse();

    await monitoringController.getAlerts({}, response);

    assert.equal(response.statusCode, 200);

    assert.deepEqual(response.body.data, [
      {
        _id: "alert-1",
        severity: "HIGH",
      },
    ]);
  } finally {
    monitoringQueryService.getAlerts = original;
  }
});

test("Monitoring controller - getAlerts handles error", async () => {
  const original = monitoringQueryService.getAlerts;

  monitoringQueryService.getAlerts = async () => {
    throw new Error("Unable to load alerts");
  };

  try {
    const response = createResponse();

    await monitoringController.getAlerts({}, response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.message, "Unable to load alerts");
  } finally {
    monitoringQueryService.getAlerts = original;
  }
});

test("Monitoring controller - getAlertById returns alert", async () => {
  const original = monitoringQueryService.getAlertById;

  monitoringQueryService.getAlertById = async (id) => ({
    _id: id,
    sensorId: "GPS-001",
  });

  try {
    const response = createResponse();

    await monitoringController.getAlertById(
      {
        params: {
          id: "alert-1",
        },
      },
      response,
    );

    assert.equal(response.statusCode, 200);

    assert.deepEqual(response.body.data, {
      _id: "alert-1",
      sensorId: "GPS-001",
    });
  } finally {
    monitoringQueryService.getAlertById = original;
  }
});

test("Monitoring controller - getAlertById returns 404 when alert is missing", async () => {
  const original = monitoringQueryService.getAlertById;

  monitoringQueryService.getAlertById = async () => null;

  try {
    const response = createResponse();

    await monitoringController.getAlertById(
      {
        params: {
          id: "missing-alert",
        },
      },
      response,
    );

    assert.equal(response.statusCode, 404);

    assert.deepEqual(response.body, {
      success: false,
      message: "Alert not found.",
    });
  } finally {
    monitoringQueryService.getAlertById = original;
  }
});

test("Monitoring controller - getAlertById handles service error", async () => {
  const original = monitoringQueryService.getAlertById;

  monitoringQueryService.getAlertById = async () => {
    throw new Error("Alert lookup failed");
  };

  try {
    const response = createResponse();

    await monitoringController.getAlertById(
      {
        params: {
          id: "alert-1",
        },
      },
      response,
    );

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.message, "Alert lookup failed");
  } finally {
    monitoringQueryService.getAlertById = original;
  }
});

test("Monitoring controller - getLogs returns logs", async () => {
  const original = monitoringQueryService.getLogs;

  monitoringQueryService.getLogs = async () => [
    {
      _id: "log-1",
      event: "READING_RECEIVED",
    },
  ];

  try {
    const response = createResponse();

    await monitoringController.getLogs({}, response);

    assert.equal(response.statusCode, 200);

    assert.equal(response.body.data[0].event, "READING_RECEIVED");
  } finally {
    monitoringQueryService.getLogs = original;
  }
});

test("Monitoring controller - getLogs handles error", async () => {
  const original = monitoringQueryService.getLogs;

  monitoringQueryService.getLogs = async () => {
    throw new Error("Unable to load logs");
  };

  try {
    const response = createResponse();

    await monitoringController.getLogs({}, response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.message, "Unable to load logs");
  } finally {
    monitoringQueryService.getLogs = original;
  }
});

test("Monitoring controller - getRiskZones returns configured zones", async () => {
  const original = monitoringQueryService.getRiskZones;

  monitoringQueryService.getRiskZones = async () => [
    {
      _id: "zone-1",
      severity: "LOW",
    },
  ];

  try {
    const response = createResponse();

    await monitoringController.getRiskZones({}, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.data[0].severity, "LOW");
  } finally {
    monitoringQueryService.getRiskZones = original;
  }
});

test("Monitoring controller - getRiskZones handles error", async () => {
  const original = monitoringQueryService.getRiskZones;

  monitoringQueryService.getRiskZones = async () => {
    throw new Error("Risk zones unavailable");
  };

  try {
    const response = createResponse();

    await monitoringController.getRiskZones({}, response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.message, "Risk zones unavailable");
  } finally {
    monitoringQueryService.getRiskZones = original;
  }
});

test("Monitoring controller - getDashboard returns dashboard data", async () => {
  const original = monitoringQueryService.getDashboard;

  monitoringQueryService.getDashboard = async () => ({
    sensors: 4,
    readings: 20,
    alerts: 2,
  });

  try {
    const response = createResponse();

    await monitoringController.getDashboard({}, response);

    assert.equal(response.statusCode, 200);

    assert.deepEqual(response.body.data, {
      sensors: 4,
      readings: 20,
      alerts: 2,
    });
  } finally {
    monitoringQueryService.getDashboard = original;
  }
});

test("Monitoring controller - getDashboard handles error", async () => {
  const original = monitoringQueryService.getDashboard;

  monitoringQueryService.getDashboard = async () => {
    throw new Error("Dashboard unavailable");
  };

  try {
    const response = createResponse();

    await monitoringController.getDashboard({}, response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.message, "Dashboard unavailable");
  } finally {
    monitoringQueryService.getDashboard = original;
  }
});

test("Monitoring controller - checkSensorHealth returns health result", async () => {
  const original = sensorHealthService.checkSensorHealth;

  sensorHealthService.checkSensorHealth = async () => ({
    checked: 3,
    failed: 1,
  });

  try {
    const response = createResponse();

    await monitoringController.checkSensorHealth({}, response);

    assert.equal(response.statusCode, 200);

    assert.deepEqual(response.body.data, {
      checked: 3,
      failed: 1,
    });
  } finally {
    sensorHealthService.checkSensorHealth = original;
  }
});

test("Monitoring controller - checkSensorHealth handles error", async () => {
  const original = sensorHealthService.checkSensorHealth;

  sensorHealthService.checkSensorHealth = async () => {
    throw new Error("Health check failed");
  };

  try {
    const response = createResponse();

    await monitoringController.checkSensorHealth({}, response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.message, "Health check failed");
  } finally {
    sensorHealthService.checkSensorHealth = original;
  }
});
