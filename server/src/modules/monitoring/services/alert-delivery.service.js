import { alertRepository } from "../repositories/alert.repository.js";
import { processingLogRepository } from "../repositories/processing-log.repository.js";

export class SimulatedAlertProvider {
  async send(alert, options = {}) {
    if (options.simulateFailure === true) {
      return {
        success: false,
        recipient: alert.recipient,

        error: "SIMULATED_DELIVERY_FAILURE",
      };
    }

    return {
      success: true,
      recipient: alert.recipient,
      error: null,
    };
  }
}

export class AlertDeliveryService {
  constructor({ provider, alerts, logs, clock = () => new Date() }) {
    this.provider = provider;
    this.alerts = alerts;
    this.logs = logs;
    this.clock = clock;
  }

  async deliver(alert, options = {}) {
    const result = await this.trySend(alert, options);

    const attemptedAt = this.clock();

    const updatedAlert = await this.alerts.addDeliveryAttempt(
      alert._id,

      {
        attemptedAt,

        success: result.success,

        recipient: result.recipient,

        error: result.error,
      },

      result.success ? attemptedAt : null,
    );

    await this.logResult(alert, result);

    return updatedAlert;
  }

  async trySend(alert, options) {
    try {
      return await this.provider.send(alert, options);
    } catch {
      return {
        success: false,
        recipient: alert.recipient,
        error: "DELIVERY_PROVIDER_ERROR",
      };
    }
  }

  logResult(alert, result) {
    return this.logs.create({
      sensorId: alert.sensorId,

      readingId: alert.readingId,

      alertId: alert._id,

      event: result.success ? "ALERT_DELIVERED" : "ALERT_DELIVERY_FAILED",

      level: result.success ? "INFO" : "ERROR",

      message: result.success
        ? "Alert delivery completed."
        : "Alert delivery failed. Alert remains pending.",

      details: {
        recipient: result.recipient,

        error: result.error,
      },
    });
  }
}

export const alertDeliveryService = new AlertDeliveryService({
  provider: new SimulatedAlertProvider(),

  alerts: alertRepository,

  logs: processingLogRepository,
});
