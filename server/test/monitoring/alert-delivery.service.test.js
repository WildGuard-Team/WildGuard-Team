import test from "node:test";
import assert from "node:assert/strict";

import {
  AlertDeliveryService,
  SimulatedAlertProvider,
} from "../../src/modules/monitoring/services/alert-delivery.service.js";

const FIXED_TIME = new Date("2026-10-09T10:00:00.000Z");

function createAlert(overrides = {}) {
  return {
    _id: "alert-1",
    sensorId: "GPS-001",
    readingId: "reading-1",
    recipient: "RANGER_MANAGER",
    deliveryStatus: "PENDING",
    ...overrides,
  };
}

function createDependencies(overrides = {}) {
  const calls = {
    attempts: [],
    logs: [],
  };

  const dependencies = {
    provider: new SimulatedAlertProvider(),

    alerts: {
      addDeliveryAttempt: async (alertId, attempt, deliveredAt) => {
        calls.attempts.push({
          alertId,
          attempt,
          deliveredAt,
        });

        return {
          _id: alertId,
          deliveryStatus: attempt.success ? "DELIVERED" : "PENDING",
          deliveredAt,
          deliveryAttempts: [attempt],
        };
      },
    },

    logs: {
      create: async (data) => {
        calls.logs.push(data);

        return {
          _id: "log-1",
          ...data,
        };
      },
    },

    clock: () => FIXED_TIME,
  };

  return {
    calls,
    dependencies: {
      ...dependencies,
      ...overrides,
    },
  };
}

test("Alert delivery - simulated provider sends alert successfully", async () => {
  const provider = new SimulatedAlertProvider();

  const result = await provider.send(createAlert());

  assert.deepEqual(result, {
    success: true,
    recipient: "RANGER_MANAGER",
    error: null,
  });
});

test("Alert delivery - simulated provider can simulate delivery failure", async () => {
  const provider = new SimulatedAlertProvider();

  const result = await provider.send(createAlert(), {
    simulateFailure: true,
  });

  assert.deepEqual(result, {
    success: false,
    recipient: "RANGER_MANAGER",
    error: "SIMULATED_DELIVERY_FAILURE",
  });
});

test("Alert delivery - records successful delivery attempt", async () => {
  const { dependencies, calls } = createDependencies();

  const service = new AlertDeliveryService(dependencies);

  const result = await service.deliver(createAlert());

  assert.equal(calls.attempts.length, 1);

  assert.equal(calls.attempts[0].alertId, "alert-1");

  assert.equal(calls.attempts[0].attempt.success, true);

  assert.equal(calls.attempts[0].attempt.recipient, "RANGER_MANAGER");

  assert.equal(calls.attempts[0].attempt.error, null);

  assert.equal(
    calls.attempts[0].attempt.attemptedAt.getTime(),
    FIXED_TIME.getTime(),
  );

  assert.equal(calls.attempts[0].deliveredAt.getTime(), FIXED_TIME.getTime());

  assert.equal(result.deliveryStatus, "DELIVERED");
});

test("Alert delivery - logs successful delivery exactly once", async () => {
  const { dependencies, calls } = createDependencies();

  const service = new AlertDeliveryService(dependencies);

  await service.deliver(createAlert());

  assert.equal(calls.logs.length, 1);

  assert.deepEqual(calls.logs[0], {
    sensorId: "GPS-001",
    readingId: "reading-1",
    alertId: "alert-1",
    event: "ALERT_DELIVERED",
    level: "INFO",
    message: "Alert delivery completed.",
    details: {
      recipient: "RANGER_MANAGER",
      error: null,
    },
  });
});

test("Alert delivery - handles simulated failure without losing alert", async () => {
  const { dependencies, calls } = createDependencies();

  const service = new AlertDeliveryService(dependencies);

  const result = await service.deliver(createAlert(), {
    simulateFailure: true,
  });

  assert.equal(calls.attempts.length, 1);

  assert.equal(calls.attempts[0].attempt.success, false);

  assert.equal(calls.attempts[0].attempt.error, "SIMULATED_DELIVERY_FAILURE");

  assert.equal(calls.attempts[0].deliveredAt, null);

  assert.equal(result.deliveryStatus, "PENDING");
});

test("Alert delivery - logs failed delivery exactly once", async () => {
  const { dependencies, calls } = createDependencies();

  const service = new AlertDeliveryService(dependencies);

  await service.deliver(createAlert(), {
    simulateFailure: true,
  });

  assert.equal(calls.logs.length, 1);

  assert.deepEqual(calls.logs[0], {
    sensorId: "GPS-001",
    readingId: "reading-1",
    alertId: "alert-1",
    event: "ALERT_DELIVERY_FAILED",
    level: "ERROR",
    message: "Alert delivery failed. Alert remains pending.",
    details: {
      recipient: "RANGER_MANAGER",
      error: "SIMULATED_DELIVERY_FAILURE",
    },
  });
});

test("Alert delivery - converts provider exception into failed delivery result", async () => {
  const provider = {
    send: async () => {
      throw new Error("Provider unavailable");
    },
  };

  const { dependencies, calls } = createDependencies({
    provider,
  });

  const service = new AlertDeliveryService(dependencies);

  const result = await service.deliver(createAlert());

  assert.equal(calls.attempts[0].attempt.success, false);

  assert.equal(calls.attempts[0].attempt.error, "DELIVERY_PROVIDER_ERROR");

  assert.equal(calls.attempts[0].deliveredAt, null);

  assert.equal(result.deliveryStatus, "PENDING");
});

test("Alert delivery - logs provider exception as failed delivery", async () => {
  const provider = {
    send: async () => {
      throw new Error("External provider crashed");
    },
  };

  const { dependencies, calls } = createDependencies({
    provider,
  });

  const service = new AlertDeliveryService(dependencies);

  await service.deliver(createAlert());

  assert.equal(calls.logs[0].event, "ALERT_DELIVERY_FAILED");

  assert.equal(calls.logs[0].level, "ERROR");

  assert.equal(calls.logs[0].details.error, "DELIVERY_PROVIDER_ERROR");
});
