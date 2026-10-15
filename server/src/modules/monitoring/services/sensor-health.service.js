import { sensorRepository } from "../repositories/sensor.repository.js";
import { processingLogRepository } from "../repositories/processing-log.repository.js";

export class SensorHealthService {
  constructor({ sensors, logs, clock = () => new Date() }) {
    this.sensors = sensors;
    this.logs = logs;
    this.clock = clock;
  }

  isTimedOut(sensor) {
    const reference = sensor.lastSeenAt ?? sensor.createdAt;

    if (!reference) {
      return false;
    }

    const allowedMs = sensor.expectedIntervalMinutes * 60 * 1000;

    const elapsedMs = this.clock().getTime() - new Date(reference).getTime();

    return elapsedMs > allowedMs;
  }

  async checkSensorHealth() {
    const sensors = await this.sensors.findAll();

    const candidates = sensors.filter(
      (sensor) => sensor.status === "ACTIVE" && this.isTimedOut(sensor),
    );

    const failedSensors = [];

    for (const sensor of candidates) {
      await this.markFailed(sensor);

      failedSensors.push(sensor.sensorId);
    }

    return {
      checked: sensors.length,

      failedSensors,
    };
  }

  async markFailed(sensor) {
    await this.sensors.setStatus(sensor.sensorId, "FAILED");

    await this.logs.create({
      sensorId: sensor.sensorId,

      event: "SENSOR_FAILURE",

      level: "ERROR",

      message: "No reading received within the expected interval.",

      details: {
        expectedIntervalMinutes: sensor.expectedIntervalMinutes,

        lastSeenAt: sensor.lastSeenAt,
      },
    });
  }
}

export const sensorHealthService = new SensorHealthService({
  sensors: sensorRepository,

  logs: processingLogRepository,
});
