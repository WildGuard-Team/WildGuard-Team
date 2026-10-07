export function toGeoJsonPoint(coordinates) {
  if (!coordinates) return undefined;
  return { type: 'Point', coordinates: [coordinates.longitude, coordinates.latitude] };
}

export function toApiCoordinates(point) {
  if (!point?.coordinates || point.coordinates.length !== 2) return null;
  const [longitude, latitude] = point.coordinates;
  return { latitude, longitude };
}

export function toPublicLocation(location) {
  return {
    source: location.source,
    coordinates: toApiCoordinates(location.point),
    displayName: location.displayName ?? null,
    manualLocation: location.manualLocation ?? null,
  };
}
