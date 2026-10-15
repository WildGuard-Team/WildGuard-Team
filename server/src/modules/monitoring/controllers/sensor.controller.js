import { sensorService } from "../services/sensor.service.js";

function success(response, data, status = 200) {
  return response.status(status).json({
    success: true,
    data,
  });
}

function failure(response, error) {
  return response.status(400).json({
    success: false,

    message: error.message || "Sensor operation failed.",
  });
}

export async function getSensors(request, response) {
  try {
    return success(response, await sensorService.getSensors());
  } catch (error) {
    return failure(response, error);
  }
}

export async function createSensor(request, response) {
  try {
    return success(
      response,
      await sensorService.createSensor(request.body),
      201,
    );
  } catch (error) {
    return failure(response, error);
  }
}

export async function updateSensor(request, response) {
  try {
    return success(
      response,
      await sensorService.updateSensor(request.params.id, request.body),
    );
  } catch (error) {
    return failure(response, error);
  }
}

export async function deleteSensor(request, response) {
  try {
    return success(
      response,
      await sensorService.deleteSensor(request.params.id),
    );
  } catch (error) {
    return failure(response, error);
  }
}
