import test from "node:test";
import assert from "node:assert/strict";

import { ReadingRepository } from "../../src/modules/monitoring/repositories/reading.repository.js";
import { Reading } from "../../src/modules/monitoring/models/reading.model.js";

test("Reading repository - creates reading", async () => {
  const original = Reading.create;

  let received = null;

  Reading.create = async (data) => {
    received = data;

    return {
      _id: "reading-1",
      ...data,
    };
  };

  try {
    const repository = new ReadingRepository();

    const result = await repository.create({
      sensorId: "GPS-001",
    });

    assert.equal(result._id, "reading-1");

    assert.deepEqual(received, {
      sensorId: "GPS-001",
    });
  } finally {
    Reading.create = original;
  }
});

test("Reading repository - finds recent readings with default limit", async () => {
  const original = Reading.find;

  let sortValue = null;
  let limitValue = null;
  let leanCalled = false;

  Reading.find = () => ({
    sort(value) {
      sortValue = value;

      return {
        limit(limit) {
          limitValue = limit;

          return {
            lean() {
              leanCalled = true;

              return ["reading-1"];
            },
          };
        },
      };
    },
  });

  try {
    const repository = new ReadingRepository();

    const result = await repository.findRecent();

    assert.deepEqual(sortValue, {
      createdAt: -1,
    });

    assert.equal(limitValue, 100);
    assert.equal(leanCalled, true);

    assert.deepEqual(result, ["reading-1"]);
  } finally {
    Reading.find = original;
  }
});

test("Reading repository - finds recent readings with custom limit", async () => {
  const original = Reading.find;

  let limitValue = null;

  Reading.find = () => ({
    sort() {
      return {
        limit(limit) {
          limitValue = limit;

          return {
            lean() {
              return [];
            },
          };
        },
      };
    },
  });

  try {
    const repository = new ReadingRepository();

    await repository.findRecent(20);

    assert.equal(limitValue, 20);
  } finally {
    Reading.find = original;
  }
});

test("Reading repository - finds reading by id and returns lean object", async () => {
  const original = Reading.findById;

  let receivedId = null;

  Reading.findById = (id) => {
    receivedId = id;

    return {
      lean() {
        return {
          _id: id,
          sensorId: "GPS-001",
        };
      },
    };
  };

  try {
    const repository = new ReadingRepository();

    const result = await repository.findById("reading-1");

    assert.equal(receivedId, "reading-1");
    assert.equal(result.sensorId, "GPS-001");
  } finally {
    Reading.findById = original;
  }
});

test("Reading repository - marks reading as processed", async () => {
  const original = Reading.findByIdAndUpdate;

  let receivedUpdate = null;
  let receivedOptions = null;

  Reading.findByIdAndUpdate = async (id, update, options) => {
    receivedUpdate = update;
    receivedOptions = options;

    return {
      _id: id,
      processingStatus: "PROCESSED",
    };
  };

  try {
    const repository = new ReadingRepository();

    const result = await repository.markProcessed("reading-1");

    assert.deepEqual(receivedUpdate, {
      $set: {
        processingStatus: "PROCESSED",
        failureReason: null,
      },
    });

    assert.deepEqual(receivedOptions, {
      new: true,
      runValidators: true,
    });

    assert.equal(result.processingStatus, "PROCESSED");
  } finally {
    Reading.findByIdAndUpdate = original;
  }
});

test("Reading repository - marks reading as failed", async () => {
  const original = Reading.findByIdAndUpdate;

  let receivedUpdate = null;

  Reading.findByIdAndUpdate = async (id, update) => {
    receivedUpdate = update;

    return {
      _id: id,
      processingStatus: "PROCESSING_FAILED",
      failureReason: "Risk analysis failed",
    };
  };

  try {
    const repository = new ReadingRepository();

    const result = await repository.markFailed(
      "reading-1",
      "Risk analysis failed",
    );

    assert.deepEqual(receivedUpdate, {
      $set: {
        processingStatus: "PROCESSING_FAILED",
        failureReason: "Risk analysis failed",
      },
    });

    assert.equal(result.processingStatus, "PROCESSING_FAILED");
  } finally {
    Reading.findByIdAndUpdate = original;
  }
});

test("Reading repository - counts all readings", async () => {
  const original = Reading.countDocuments;

  let receivedFilter = null;

  Reading.countDocuments = async (filter) => {
    receivedFilter = filter;
    return 12;
  };

  try {
    const repository = new ReadingRepository();

    const result = await repository.count();

    assert.deepEqual(receivedFilter, {});
    assert.equal(result, 12);
  } finally {
    Reading.countDocuments = original;
  }
});

test("Reading repository - counts readings using filter", async () => {
  const original = Reading.countDocuments;

  let receivedFilter = null;

  Reading.countDocuments = async (filter) => {
    receivedFilter = filter;
    return 8;
  };

  try {
    const repository = new ReadingRepository();

    const result = await repository.count({
      validationStatus: "VALID",
    });

    assert.deepEqual(receivedFilter, {
      validationStatus: "VALID",
    });

    assert.equal(result, 8);
  } finally {
    Reading.countDocuments = original;
  }
});
