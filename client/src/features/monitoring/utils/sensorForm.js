export const SENSOR_TYPES = Object.freeze([
  {
    value: "GPS_COLLAR",
    label: "GPS Collar",
  },
  {
    value: "CAMERA_TRAP",
    label: "Camera Trap",
  },
]);

export const SENSOR_STATUSES = Object.freeze([
  {
    value: "ACTIVE",
    label: "Active",
  },
  {
    value: "INACTIVE",
    label: "Inactive",
  },
  {
    value: "FAILED",
    label: "Failed",
  },
]);

export function createEmptySensorForm() {
  return {
    sensorId: "",
    name: "",
    type: "GPS_COLLAR",
    status: "ACTIVE",
    animalId: "",
    expectedIntervalMinutes: "30",
    latitude: "",
    longitude: "",
  };
}

export function sensorToForm(sensor) {
  return {
    sensorId: sensor.sensorId ?? "",

    name: sensor.name ?? "",

    type: sensor.type ?? "GPS_COLLAR",

    status: sensor.status ?? "ACTIVE",

    animalId: sensor.animalId ?? "",

    expectedIntervalMinutes: String(sensor.expectedIntervalMinutes ?? 30),

    latitude: String(sensor.location?.latitude ?? ""),

    longitude: String(sensor.location?.longitude ?? ""),
  };
}

export function formToSensorPayload(form) {
  return {
    sensorId: form.sensorId.trim().toUpperCase(),

    name: form.name.trim(),

    type: form.type,

    status: form.status,

    animalId: form.animalId.trim() || null,

    expectedIntervalMinutes: Number(form.expectedIntervalMinutes),

    location: {
      latitude: Number(form.latitude),

      longitude: Number(form.longitude),
    },
  };
}

export function formatSensorType(type) {
  return SENSOR_TYPES.find((item) => item.value === type)?.label ?? type;
}

export function formatLocation(location) {
  if (!location) {
    return "Not available";
  }

  return `${location.latitude}, ${location.longitude}`;
}

export function formatDateTime(value) {
  if (!value) {
    return "Never";
  }

  return new Date(value).toLocaleString();
}
