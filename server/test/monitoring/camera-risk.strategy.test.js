import test from "node:test";
import assert from "node:assert/strict";

import { CameraRiskStrategy } from "../../src/modules/monitoring/services/risk/camera-risk.strategy.js";

test("Camera risk analysis - detects high-confidence human", () => {
  const strategy = new CameraRiskStrategy();

  const result = strategy.analyze({
    values: {
      detection: "HUMAN",
      confidence: 0.85,
    },
  });

  assert.equal(result.riskDetected, true);
  assert.equal(result.level, "HIGH");
  assert.equal(result.type, "HUMAN_DETECTED");

  assert.equal(
    result.message,
    "High-confidence human detection recorded by camera trap.",
  );

  assert.equal(result.zoneId, null);
  assert.equal(result.distanceMeters, null);

  assert.deepEqual(result.metadata, {
    detection: "HUMAN",
    confidence: 0.85,
  });
});

test("Camera risk analysis - accepts threshold confidence of 0.8 as risk", () => {
  const strategy = new CameraRiskStrategy();

  const result = strategy.analyze({
    values: {
      detection: "HUMAN",
      confidence: 0.8,
    },
  });

  assert.equal(result.riskDetected, true);
  assert.equal(result.level, "HIGH");
  assert.equal(result.type, "HUMAN_DETECTED");
});

test("Camera risk analysis - human below confidence threshold is safe", () => {
  const strategy = new CameraRiskStrategy();

  const result = strategy.analyze({
    values: {
      detection: "HUMAN",
      confidence: 0.79,
    },
  });

  assert.equal(result.riskDetected, false);
  assert.equal(result.level, "NONE");
  assert.equal(result.type, null);

  assert.equal(result.message, "No high-risk camera detection.");

  assert.deepEqual(result.metadata, {
    detection: "HUMAN",
    confidence: 0.79,
  });
});

test("Camera risk analysis - benign animal detection yields no risk", () => {
  const strategy = new CameraRiskStrategy();

  const result = strategy.analyze({
    values: {
      detection: "DEER",
      confidence: 0.95,
    },
  });

  assert.equal(result.riskDetected, false);
  assert.equal(result.level, "NONE");
  assert.equal(result.type, null);

  assert.deepEqual(result.metadata, {
    detection: "DEER",
    confidence: 0.95,
  });
});

test("Camera risk analysis - normalizes lowercase detection", () => {
  const strategy = new CameraRiskStrategy();

  const result = strategy.analyze({
    values: {
      detection: "human",
      confidence: 0.9,
    },
  });

  assert.equal(result.riskDetected, true);

  assert.deepEqual(result.metadata, {
    detection: "HUMAN",
    confidence: 0.9,
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
