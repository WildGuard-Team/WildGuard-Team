import test from "node:test";
import assert from "node:assert/strict";

import { CameraRiskStrategy } from "../../src/modules/monitoring/services/risk/camera-risk.strategy.js";

test("Camera risk analysis - detects elephant at threshold confidence", () => {
  const strategy = new CameraRiskStrategy();

  const result = strategy.analyze({
    values: {
      detection: "ELEPHANT",
      confidence: 0.7,
    },
  });

  assert.equal(result.riskDetected, true);
  assert.equal(result.level, "HIGH");
  assert.equal(result.type, "ELEPHANT_DETECTED");

  assert.equal(result.message, "Elephant detected by camera trap.");

  assert.equal(result.zoneId, null);
  assert.equal(result.distanceMeters, null);

  assert.deepEqual(result.metadata, {
    detection: "ELEPHANT",
    confidence: 0.7,
  });
});

test("Camera risk analysis - detects high-confidence elephant", () => {
  const strategy = new CameraRiskStrategy();

  const result = strategy.analyze({
    values: {
      detection: "ELEPHANT",
      confidence: 0.95,
    },
  });

  assert.equal(result.riskDetected, true);
  assert.equal(result.level, "HIGH");
  assert.equal(result.type, "ELEPHANT_DETECTED");
});

test("Camera risk analysis - elephant below confidence threshold is safe", () => {
  const strategy = new CameraRiskStrategy();

  const result = strategy.analyze({
    values: {
      detection: "ELEPHANT",
      confidence: 0.69,
    },
  });

  assert.equal(result.riskDetected, false);
  assert.equal(result.level, "NONE");
  assert.equal(result.type, null);

  assert.equal(result.message, "No elephant detected by camera trap.");
});

test("Camera risk analysis - human detection does not create elephant risk", () => {
  const strategy = new CameraRiskStrategy();

  const result = strategy.analyze({
    values: {
      detection: "HUMAN",
      confidence: 0.95,
    },
  });

  assert.equal(result.riskDetected, false);
  assert.equal(result.level, "NONE");
  assert.equal(result.type, null);
});

test("Camera risk analysis - deer detection yields no risk", () => {
  const strategy = new CameraRiskStrategy();

  const result = strategy.analyze({
    values: {
      detection: "DEER",
      confidence: 0.95,
    },
  });

  assert.equal(result.riskDetected, false);
  assert.equal(result.level, "NONE");
});

test("Camera risk analysis - normalizes lowercase elephant detection", () => {
  const strategy = new CameraRiskStrategy();

  const result = strategy.analyze({
    values: {
      detection: "elephant",
      confidence: 0.8,
    },
  });

  assert.equal(result.riskDetected, true);

  assert.deepEqual(result.metadata, {
    detection: "ELEPHANT",
    confidence: 0.8,
  });
});

test("Camera risk analysis - missing values returns safe result", () => {
  const strategy = new CameraRiskStrategy();

  const result = strategy.analyze({
    values: undefined,
  });

  assert.equal(result.riskDetected, false);
  assert.equal(result.level, "NONE");

  assert.deepEqual(result.metadata, {
    detection: "",
    confidence: 0,
  });
});
