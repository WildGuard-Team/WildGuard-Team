const API_BASE = "/api/monitoring";

async function parseResponse(response) {
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.message || "Unable to complete monitoring request.");
  }

  return body.data;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",

    headers: {
      "Content-Type": "application/json",

      ...options.headers,
    },

    ...options,
  });

  return parseResponse(response);
}

function jsonRequest(path, method, body) {
  return request(path, {
    method,
    body: JSON.stringify(body),
  });
}

export const monitoringApi = {
  getDashboard() {
    return request("/dashboard");
  },

  getSensors() {
    return request("/sensors");
  },

  createSensor(sensor) {
    return jsonRequest("/sensors", "POST", sensor);
  },

  updateSensor(id, sensor) {
    return jsonRequest(`/sensors/${id}`, "PUT", sensor);
  },

  deleteSensor(id) {
    return request(`/sensors/${id}`, {
      method: "DELETE",
    });
  },

  simulateReading(reading) {
    return jsonRequest("/readings/simulate", "POST", reading);
  },

  getReadings() {
    return request("/readings");
  },

  getAlerts() {
    return request("/alerts");
  },

  getAlert(id) {
    return request(`/alerts/${id}`);
  },

  getLogs() {
    return request("/logs");
  },

  getRiskZones() {
    return request("/risk-zones");
  },

  checkSensorHealth() {
    return request("/sensors/check-health", {
      method: "POST",
    });
  },
};
