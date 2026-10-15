import { Location } from "../domain/location.js";
import { sensorRepository } from "../repositories/sensor.repository.js";

const SENSOR_TYPES = new Set(["GPS_COLLAR", "CAMERA_TRAP"]);

const SENSOR_STATUSES = new Set(["ACTIVE", "INACTIVE", "FAILED"]);

function requireText(value, fieldName) {
  const result = String(value ?? "").trim();

  if (!result) {
    throw new Error(`${fieldName} is required.`);
  }

  return result;
}

function parseInterval(value) {
  const interval = Number(value);

  if (!Number.isInteger(interval) || interval < 1) {
    throw new Error("Expected interval must be a positive integer.");
  }

  return interval;
}

function validateEnum(value, allowed, message) {
  if (!allowed.has(value)) {
    throw new Error(message);
  }

  return value;
}

function buildSensorData(input) {
  const location = new Location(
    input.location?.latitude,
    input.location?.longitude,
  ).toObject();

  const sensorId = requireText(input.sensorId, "Sensor ID").toUpperCase();

  return {
    sensorId,

    name: requireText(input.name, "Sensor name"),

    type: validateEnum(input.type, SENSOR_TYPES, "Invalid sensor type."),

    status: validateEnum(
      input.status ?? "ACTIVE",
      SENSOR_STATUSES,
      "Invalid sensor status.",
    ),

    animalId: String(input.animalId ?? "").trim() || null,

    expectedIntervalMinutes: parseInterval(input.expectedIntervalMinutes),

    location,
  };
}

export class SensorService {
  constructor(repository) {
    this.repository = repository;
  }

  getSensors() {
    return this.repository.findAll();
  }

  async createSensor(input) {
    const data = buildSensorData(input);

    const existing = await this.repository.findBySensorId(data.sensorId);

    if (existing) {
      throw new Error("Sensor ID already exists.");
    }

    return this.repository.create(data);
  }

  async updateSensor(id, input) {
    const data = buildSensorData(input);

    const duplicate = await this.repository.findBySensorId(data.sensorId);

    if (duplicate && String(duplicate._id) !== String(id)) {
      throw new Error("Sensor ID already exists.");
    }

    const sensor = await this.repository.updateById(id, data);

    if (!sensor) {
      throw new Error("Sensor not found.");
    }

    return sensor;
  }

  async deleteSensor(id) {
    const sensor = await this.repository.deleteById(id);

    if (!sensor) {
      throw new Error("Sensor not found.");
    }

    return sensor;
  }
}

export const sensorService = new SensorService(sensorRepository);
