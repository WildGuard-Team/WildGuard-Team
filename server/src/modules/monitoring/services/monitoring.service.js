import { Location } from "../domain/location.js";

import { readingFactory } from "../factories/reading.factory.js";

import { sensorRepository } from "../repositories/sensor.repository.js";
import { readingRepository } from "../repositories/reading.repository.js";
import { analysisRepository } from "../repositories/analysis.repository.js";

import { readingValidationService } from "./validation.service.js";
import { riskAnalysisService } from "./risk-analysis.service.js";
import { alertService } from "./alert.service.js";
import { alertDeliveryService } from "./alert-delivery.service.js";
import { processingLogService } from "./processing-log.service.js";

function normalizeSensorId(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function normalizeInput(input, timestamp) {
  return {
    sensorId: normalizeSensorId(input?.sensorId),

    timestamp,

    location: input?.location ?? null,

    values: input?.values ?? {},
  };
}

function createRawData(input) {
  return {
    sensorId: input.sensorId,

    timestamp: input.timestamp,

    location: input.location,

    values: input.values,
  };
}

export class MonitoringService {
  constructor({
    sensors,
    readings,
    analyses,
    validator,
    riskAnalyzer,
    alerts,
    delivery,
    logs,
    factory,
    clock = () => new Date(),
  }) {
    this.sensors = sensors;
    this.readings = readings;
    this.analyses = analyses;
    this.validator = validator;
    this.riskAnalyzer = riskAnalyzer;
    this.alerts = alerts;
    this.delivery = delivery;
    this.logs = logs;
    this.factory = factory;
    this.clock = clock;
  }

  async processReading(rawInput) {
    const input = normalizeInput(
      rawInput,
      this.resolveTimestamp(rawInput?.timestamp ?? rawInput?.recordedAt),
    );

    await this.logs.received(input.sensorId || null);

    const sensor = await this.findSensor(input.sensorId);

    const validation = this.validator.validate(input, sensor);

    if (!validation.valid) {
      return this.rejectReading(input, sensor, validation.errors);
    }

    return this.processValidReading(input, sensor);
  }

  async processValidReading(input, sensor) {
    let reading = null;

    try {
      const location = new Location(
        input.location.latitude,
        input.location.longitude,
      ).toObject();

      reading = await this.createPendingReading(input, sensor, location);

      await this.logs.validated(sensor.sensorId, reading._id);

      const riskResult = await this.riskAnalyzer.analyze({
        sensor,
        location,
        values: input.values,
      });

      const analysis = await this.saveAnalysis(reading, sensor, riskResult);

      await this.logs.analyzed(sensor.sensorId, reading._id, riskResult);

      const alert = await this.createAndDeliverAlert(
        sensor,
        reading,
        analysis,
        riskResult,
        location,
      );

      const processedReading = await this.readings.markProcessed(reading._id);

      const updatedSensor = await this.sensors.updateLatestReading(
        sensor.sensorId,
        location,
        input.timestamp,
      );

      return {
        sensor: updatedSensor,

        reading: processedReading,

        analysis,

        alert,
      };
    } catch (error) {
      await this.handleFailure(input.sensorId, reading?._id ?? null, error);

      throw error;
    }
  }

  async rejectReading(input, sensor, errors) {
    const readingData = this.factory.createRejected({
      sensorId: input.sensorId || "UNKNOWN",

      sensorType: sensor?.type ?? null,

      location: input.location,

      values: input.values,

      rawData: createRawData(input),

      timestamp: input.timestamp,

      rejectionReasons: errors,
    });

    const reading = await this.readings.create(readingData);

    await this.logs.rejected(input.sensorId || null, reading._id, errors);

    return {
      sensor: sensor ?? null,

      reading,

      analysis: null,
      alert: null,
    };
  }

  async createPendingReading(input, sensor, location) {
    const data = this.factory.createValid({
      sensor,
      location,
      values: input.values,

      rawData: createRawData(input),

      timestamp: input.timestamp,
    });

    return this.readings.create(data);
  }

  saveAnalysis(reading, sensor, result) {
    return this.analyses.create({
      readingId: reading._id,

      sensorId: sensor.sensorId,

      riskLevel: result.level,

      riskDetected: result.riskDetected,

      riskType: result.type,

      reason: result.message,

      zoneId: result.zoneId,

      distanceMeters: result.distanceMeters,

      metadata: result.metadata ?? {},
    });
  }

  async createAndDeliverAlert(sensor, reading, analysis, riskResult, location) {
    if (!riskResult.riskDetected) {
      await this.alerts.resolveSensorAlerts(sensor.sensorId);

      await this.logs.noAlert(sensor.sensorId, reading._id);

      return null;
    }

    const alert = await this.alerts.createFromRisk({
      sensor,
      reading,
      analysisDocument: analysis,
      riskResult,
      location,
    });

    await this.logs.alertCreated(sensor.sensorId, reading._id, alert._id);

    return this.delivery.deliver(alert);
  }

  findSensor(sensorId) {
    if (!sensorId) {
      return null;
    }

    return this.sensors.findBySensorId(sensorId);
  }

  resolveTimestamp(value) {
    if (!value) {
      return this.clock();
    }

    const timestamp = new Date(value);

    if (!Number.isFinite(timestamp.getTime())) {
      return value;
    }

    return timestamp;
  }

  async handleFailure(sensorId, readingId, error) {
    if (readingId) {
      await this.safeMarkFailed(readingId, error);
    }

    await this.safeLogFailure(sensorId, readingId, error);
  }

  async safeMarkFailed(readingId, error) {
    try {
      await this.readings.markFailed(readingId, error.message);
    } catch {
      // Keep original processing error.
    }
  }

  async safeLogFailure(sensorId, readingId, error) {
    try {
      await this.logs.failed(sensorId, readingId, error);
    } catch {
      // Keep original processing error.
    }
  }
}

export const monitoringService = new MonitoringService({
  sensors: sensorRepository,

  readings: readingRepository,

  analyses: analysisRepository,

  validator: readingValidationService,

  riskAnalyzer: riskAnalysisService,

  alerts: alertService,

  delivery: alertDeliveryService,

  logs: processingLogService,

  factory: readingFactory,
});
