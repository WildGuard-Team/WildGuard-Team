import test from "node:test";
import assert from "node:assert/strict";

import { AlertRepository } from "../../src/modules/monitoring/repositories/alert.repository.js";
import { Alert } from "../../src/modules/monitoring/models/alert.model.js";

test("Alert repository - creates alert", async () => {
  const original = Alert.create;

  let received = null;

  Alert.create = async (data) => {
    received = data;

    return {
      _id: "alert-1",
      ...data,
    };
  };

  try {
    const repository = new AlertRepository();

    const result = await repository.create({
      sensorId: "GPS-001",
      severity: "HIGH",
    });

    assert.equal(result._id, "alert-1");

    assert.deepEqual(received, {
      sensorId: "GPS-001",
      severity: "HIGH",
    });
  } finally {
    Alert.create = original;
  }
});

test("Alert repository - finds recent alerts with default limit", async () => {
  const original = Alert.find;

  let sortValue = null;
  let limitValue = null;

  Alert.find = () => ({
    sort(value) {
      sortValue = value;

      return {
        limit(limit) {
          limitValue = limit;

          return ["alert-1"];
        },
      };
    },
  });

  try {
    const repository = new AlertRepository();

    const result = await repository.findRecent();

    assert.deepEqual(sortValue, {
      createdAt: -1,
    });

    assert.equal(limitValue, 50);

    assert.deepEqual(result, ["alert-1"]);
  } finally {
    Alert.find = original;
  }
});

test("Alert repository - finds recent alerts with custom limit", async () => {
  const original = Alert.find;

  let limitValue = null;

  Alert.find = () => ({
    sort() {
      return {
        limit(limit) {
          limitValue = limit;

          return [];
        },
      };
    },
  });

  try {
    const repository = new AlertRepository();

    await repository.findRecent(10);

    assert.equal(limitValue, 10);
  } finally {
    Alert.find = original;
  }
});

test("Alert repository - finds alert by id", async () => {
  const original = Alert.findById;

  Alert.findById = async (id) => ({
    _id: id,
    sensorId: "GPS-001",
  });

  try {
    const repository = new AlertRepository();

    const result = await repository.findById("alert-1");

    assert.equal(result._id, "alert-1");
    assert.equal(result.sensorId, "GPS-001");
  } finally {
    Alert.findById = original;
  }
});

test("Alert repository - successful delivery sets delivered status", async () => {
  const original = Alert.findByIdAndUpdate;

  let receivedId = null;
  let receivedUpdate = null;
  let receivedOptions = null;

  Alert.findByIdAndUpdate = async (id, update, options) => {
    receivedId = id;
    receivedUpdate = update;
    receivedOptions = options;

    return {
      _id: id,
      deliveryStatus: "DELIVERED",
    };
  };

  try {
    const repository = new AlertRepository();

    const attemptedAt = new Date("2026-10-09T10:00:00.000Z");

    const result = await repository.addDeliveryAttempt("alert-1", {
      attemptedAt,
      success: true,
      recipient: "RANGER_MANAGER",
      error: null,
    });

    assert.equal(receivedId, "alert-1");

    assert.equal(receivedUpdate.$set.deliveryStatus, "DELIVERED");

    assert.equal(
      receivedUpdate.$set.deliveredAt.getTime(),
      attemptedAt.getTime(),
    );

    assert.equal(receivedUpdate.$push.deliveryAttempts.success, true);

    assert.deepEqual(receivedOptions, {
      new: true,
      runValidators: true,
    });

    assert.equal(result.deliveryStatus, "DELIVERED");
  } finally {
    Alert.findByIdAndUpdate = original;
  }
});

test("Alert repository - failed delivery remains pending", async () => {
  const original = Alert.findByIdAndUpdate;

  let receivedUpdate = null;

  Alert.findByIdAndUpdate = async (id, update) => {
    receivedUpdate = update;

    return {
      _id: id,
      deliveryStatus: "PENDING",
    };
  };

  try {
    const repository = new AlertRepository();

    const result = await repository.addDeliveryAttempt("alert-1", {
      attemptedAt: new Date(),
      success: false,
      recipient: "RANGER_MANAGER",
      error: "FAILED",
    });

    assert.equal(receivedUpdate.$set.deliveryStatus, "PENDING");

    assert.equal(
      Object.prototype.hasOwnProperty.call(receivedUpdate.$set, "deliveredAt"),
      false,
    );

    assert.equal(result.deliveryStatus, "PENDING");
  } finally {
    Alert.findByIdAndUpdate = original;
  }
});

test("Alert repository - resolves active alerts for sensor", async () => {
  const original = Alert.updateMany;

  let filter = null;
  let update = null;
  let options = null;

  Alert.updateMany = async (
    receivedFilter,
    receivedUpdate,
    receivedOptions,
  ) => {
    filter = receivedFilter;
    update = receivedUpdate;
    options = receivedOptions;

    return {
      acknowledged: true,
      modifiedCount: 2,
    };
  };

  try {
    const repository = new AlertRepository();

    const result = await repository.resolveActiveAlertsForSensor("GPS-001");

    assert.equal(filter.sensorId, "GPS-001");

    assert.deepEqual(filter.$or, [
      {
        status: "ACTIVE",
      },
      {
        status: {
          $exists: false,
        },
      },
      {
        status: null,
      },
    ]);

    assert.equal(update.$set.status, "RESOLVED");

    assert.ok(update.$set.resolvedAt instanceof Date);

    assert.deepEqual(options, {
      runValidators: true,
    });

    assert.equal(result.modifiedCount, 2);
  } finally {
    Alert.updateMany = original;
  }
});

test("Alert repository - counts alerts", async () => {
  const original = Alert.countDocuments;

  Alert.countDocuments = async () => 7;

  try {
    const repository = new AlertRepository();

    const result = await repository.count();

    assert.equal(result, 7);
  } finally {
    Alert.countDocuments = original;
  }
});
