import { alertRepository } from "../repositories/alert.repository.js";

export class AlertService {
  constructor(repository) {
    this.repository = repository;
  }

  createFromRisk({ sensor, reading, analysisDocument, riskResult, location }) {
    if (!riskResult.riskDetected) {
      return null;
    }

    return this.repository.create({
      readingId: reading._id,

      analysisId: analysisDocument._id,

      sensorId: sensor.sensorId,

      type: riskResult.type,

      severity: riskResult.level,

      message: riskResult.message,

      location,

      status: "ACTIVE",

      resolvedAt: null,

      deliveryStatus: "PENDING",

      recipient: "RANGER_MANAGER",
    });
  }

  resolveSensorAlerts(sensorId) {
    return this.repository.resolveActiveAlertsForSensor(sensorId);
  }
}

export const alertService = new AlertService(alertRepository);
