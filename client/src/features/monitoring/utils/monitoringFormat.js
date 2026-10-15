export function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatNumber(value) {
  return new Intl.NumberFormat("en-LK").format(
    Number.isFinite(Number(value)) ? Number(value) : 0,
  );
}

export function formatLabel(value) {
  if (!value) return "N/A";

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatCoordinate(value) {
  const number = Number(value);

  return value !== null &&
    value !== undefined &&
    value !== "" &&
    Number.isFinite(number)
    ? number.toFixed(5)
    : "N/A";
}

export function getStatusTone(status) {
  const normalized = String(status ?? "").toUpperCase();

  if (
    [
      "HIGH",
      "CRITICAL",
      "FAILED",
      "REJECTED",
      "PROCESSING_FAILED",
      "ERROR",
    ].includes(normalized)
  ) {
    return "danger";
  }

  if (["MEDIUM", "PENDING", "WARNING"].includes(normalized)) {
    return "warning";
  }

  if (
    ["ACTIVE", "VALID", "PROCESSED", "DELIVERED", "NONE", "INFO"].includes(
      normalized,
    )
  ) {
    return "success";
  }

  return "neutral";
}

export function hasValidCoordinates(location) {
  if (!location) return false;

  const { latitude, longitude } = location;

  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}
