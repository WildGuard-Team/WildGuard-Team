const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

export function calculateDistanceMeters(pointA, pointB) {
  const latitudeDifference = toRadians(pointB.latitude - pointA.latitude);

  const longitudeDifference = toRadians(pointB.longitude - pointA.longitude);

  const latitudeA = toRadians(pointA.latitude);

  const latitudeB = toRadians(pointB.latitude);

  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(latitudeA) *
      Math.cos(latitudeB) *
      Math.sin(longitudeDifference / 2) ** 2;

  const clamped = Math.min(1, Math.max(0, a));

  const centralAngle =
    2 * Math.atan2(Math.sqrt(clamped), Math.sqrt(1 - clamped));

  return EARTH_RADIUS_METERS * centralAngle;
}

export function isInsideRiskZone(point, zone) {
  const distanceMeters = calculateDistanceMeters(point, zone.center);

  return {
    inside: distanceMeters <= zone.radiusMeters,

    distanceMeters,
  };
}
