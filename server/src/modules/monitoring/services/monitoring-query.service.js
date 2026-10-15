import { sensorRepository } from "../repositories/sensor.repository.js";
import { readingRepository } from "../repositories/reading.repository.js";
import { alertRepository } from "../repositories/alert.repository.js";
import { processingLogRepository } from "../repositories/processing-log.repository.js";
import { riskZoneRepository } from "../repositories/risk-zone.repository.js";

export class MonitoringQueryService {
  constructor({ sensors, readings, alerts, logs, zones }) {
    this.sensors = sensors;
    this.readings = readings;
    this.alerts = alerts;
    this.logs = logs;
    this.zones = zones;
  }

  getReadings() {
    return this.readings.findRecent(100);
  }

  getAlerts() {
    return this.alerts.findRecent(100);
  }

  getAlertById(id) {
    return this.alerts.findById(id);
  }

  getLogs() {
    return this.logs.findRecent(200);
  }

  getRiskZones() {
    return this.zones.findAll();
  }

  async getDashboard() {
    const [sensors, readings, alerts, logs] = await Promise.all([
      this.sensors.count(),
      this.readings.count(),
      this.alerts.count(),
      this.logs.count(),
    ]);

    return {
      sensors,
      readings,
      alerts,
      logs,
    };
  }
}

export const monitoringQueryService = new MonitoringQueryService({
  sensors: sensorRepository,

  readings: readingRepository,

  alerts: alertRepository,

  logs: processingLogRepository,

  zones: riskZoneRepository,
});
