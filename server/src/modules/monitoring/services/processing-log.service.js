import { processingLogRepository } from "../repositories/processing-log.repository.js";

const EVENTS = Object.freeze({
  RECEIVED: "READING_RECEIVED",

  VALIDATED: "READING_VALIDATED",

  REJECTED: "READING_REJECTED",

  RISK_ANALYSIS: "RISK_ANALYSIS_COMPLETED",

  ALERT_CREATED: "ALERT_CREATED",

  NO_ALERT: "NO_ALERT_REQUIRED",

  PROCESSING_FAILED: "PROCESSING_FAILED",
});

export class ProcessingLogService {
  constructor(repository) {
    this.repository = repository;
  }

  create(data) {
    return this.repository.create(data);
  }

  received(sensorId) {
    return this.create({
      sensorId,
      event: EVENTS.RECEIVED,
      level: "INFO",
      message: "Sensor reading received.",
      details: {},
    });
  }

  validated(sensorId, readingId) {
    return this.create({
      sensorId,
      readingId,
      event: EVENTS.VALIDATED,
      level: "INFO",
      message: "Sensor reading validation completed successfully.",
      details: {},
    });
  }

  rejected(sensorId, readingId, reasons) {
    return this.create({
      sensorId,
      readingId,
      event: EVENTS.REJECTED,
      level: "WARNING",
      message: "Sensor reading was rejected.",

      details: {
        reasons,
      },
    });
  }

  analyzed(sensorId, readingId, analysis) {
    return this.create({
      sensorId,
      readingId,

      event: EVENTS.RISK_ANALYSIS,

      level: analysis.riskDetected ? "WARNING" : "INFO",

      message: analysis.message,

      details: {
        riskDetected: analysis.riskDetected,

        riskLevel: analysis.level,

        riskType: analysis.type,

        zoneId: analysis.zoneId,

        distanceMeters: analysis.distanceMeters,
      },
    });
  }

  alertCreated(sensorId, readingId, alertId) {
    return this.create({
      sensorId,
      readingId,
      alertId,

      event: EVENTS.ALERT_CREATED,

      level: "WARNING",

      message: "Risk alert created.",

      details: {},
    });
  }

  noAlert(sensorId, readingId) {
    return this.create({
      sensorId,
      readingId,

      event: EVENTS.NO_ALERT,

      level: "INFO",

      message: "No alert was required.",

      details: {},
    });
  }

  failed(sensorId, readingId, error) {
    return this.create({
      sensorId,
      readingId,

      event: EVENTS.PROCESSING_FAILED,

      level: "ERROR",

      message: error?.message || "Reading processing failed.",

      details: {},
    });
  }
}

export const processingLogService = new ProcessingLogService(
  processingLogRepository,
);
