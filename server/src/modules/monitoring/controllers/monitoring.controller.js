import { monitoringService } from "../services/monitoring.service.js";
import { monitoringQueryService } from "../services/monitoring-query.service.js";
import { sensorHealthService } from "../services/sensor-health.service.js";

function success(response, data, status = 200) {
  return response.status(status).json({
    success: true,
    data,
  });
}

function failure(response, error) {
  return response.status(400).json({
    success: false,

    message: error.message || "Monitoring operation failed.",
  });
}

export async function simulateReading(request, response) {
  try {
    const result = await monitoringService.processReading(request.body);

    return success(response, result, 201);
  } catch (error) {
    return failure(response, error);
  }
}

export async function getReadings(request, response) {
  try {
    return success(response, await monitoringQueryService.getReadings());
  } catch (error) {
    return failure(response, error);
  }
}

export async function getAlerts(request, response) {
  try {
    return success(response, await monitoringQueryService.getAlerts());
  } catch (error) {
    return failure(response, error);
  }
}

export async function getAlertById(request, response) {
  try {
    const alert = await monitoringQueryService.getAlertById(request.params.id);

    if (!alert) {
      return response.status(404).json({
        success: false,
        message: "Alert not found.",
      });
    }

    return success(response, alert);
  } catch (error) {
    return failure(response, error);
  }
}

export async function getLogs(request, response) {
  try {
    return success(response, await monitoringQueryService.getLogs());
  } catch (error) {
    return failure(response, error);
  }
}

export async function getRiskZones(request, response) {
  try {
    return success(response, await monitoringQueryService.getRiskZones());
  } catch (error) {
    return failure(response, error);
  }
}

export async function getDashboard(request, response) {
  try {
    return success(response, await monitoringQueryService.getDashboard());
  } catch (error) {
    return failure(response, error);
  }
}

export async function checkSensorHealth(request, response) {
  try {
    return success(response, await sensorHealthService.checkSensorHealth());
  } catch (error) {
    return failure(response, error);
  }
}
