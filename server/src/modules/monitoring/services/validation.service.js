const SUPPORTED_SENSOR_TYPES = new Set(["GPS_COLLAR", "CAMERA_TRAP"]);

const CAMERA_DETECTIONS = new Set([
  "NONE",
  "HUMAN",
  "ANIMAL",
  "ELEPHANT",
  "DEER",
  "LEOPARD",
]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isValidTimestamp(timestamp, now) {
  const parsed = new Date(timestamp);

  return Number.isFinite(parsed.getTime()) && parsed.getTime() <= now.getTime();
}

function isValidCoordinate(location) {
  if (!location) {
    return false;
  }

  const { latitude, longitude } = location;

  return (
    Number.isFinite(Number(latitude)) &&
    Number(latitude) >= -90 &&
    Number(latitude) <= 90 &&
    Number.isFinite(Number(longitude)) &&
    Number(longitude) >= -180 &&
    Number(longitude) <= 180
  );
}

class GpsReadingValidator {
  validate(values) {
    if (!isObject(values)) {
      return ["INVALID_SENSOR_VALUES"];
    }

    if (values.batteryLevel == null) {
      return [];
    }

    const battery = Number(values.batteryLevel);

    if (!Number.isFinite(battery) || battery < 0 || battery > 100) {
      return ["INVALID_BATTERY_LEVEL"];
    }

    return [];
  }
}

class CameraReadingValidator {
  validate(values) {
    if (!isObject(values)) {
      return ["INVALID_SENSOR_VALUES"];
    }

    const errors = [];

    const detection = String(values.detection ?? "").toUpperCase();

    if (!CAMERA_DETECTIONS.has(detection)) {
      errors.push("INVALID_CAMERA_DETECTION");
    }

    const confidence = Number(values.confidence);

    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      errors.push("INVALID_CONFIDENCE");
    }

    return errors;
  }
}

const valueValidators = new Map([
  ["GPS_COLLAR", new GpsReadingValidator()],
  ["CAMERA_TRAP", new CameraReadingValidator()],
]);

export class ReadingValidationService {
  constructor({ clock = () => new Date() } = {}) {
    this.clock = clock;
  }

  validate(input, sensor) {
    if (!isObject(input)) {
      return this.result(["INVALID_READING"]);
    }

    const errors = [
      ...this.validateSensor(input, sensor),
      ...this.validateCommonFields(input),
      ...this.validateSensorValues(input, sensor),
    ];

    return this.result(errors);
  }

  validateSensor(input, sensor) {
    const errors = [];

    if (typeof input.sensorId !== "string" || !input.sensorId.trim()) {
      errors.push("SENSOR_ID_REQUIRED");
    }

    if (!sensor) {
      errors.push("UNKNOWN_SENSOR");
      return errors;
    }

    if (sensor.status !== "ACTIVE") {
      errors.push("SENSOR_NOT_ACTIVE");
    }

    if (!SUPPORTED_SENSOR_TYPES.has(sensor.type)) {
      errors.push("UNSUPPORTED_SENSOR_TYPE");
    }

    return errors;
  }

  validateCommonFields(input) {
    const errors = [];

    if (!isValidTimestamp(input.timestamp, this.clock())) {
      errors.push("INVALID_TIMESTAMP");
    }

    if (!isValidCoordinate(input.location)) {
      errors.push("INVALID_COORDINATES");
    }

    return errors;
  }

  validateSensorValues(input, sensor) {
    if (!sensor) {
      return [];
    }

    const validator = valueValidators.get(sensor.type);

    return validator ? validator.validate(input.values) : [];
  }

  result(errors) {
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const readingValidationService = new ReadingValidationService();
