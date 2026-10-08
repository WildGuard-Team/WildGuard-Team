export function formatSubmittedDate(value) {
  const date = new Date(value ?? '');
  return Number.isFinite(date.getTime())
    ? date.toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Date unavailable';
}

export function reportLocationText(location) {
  if (location?.displayName) return location.displayName;
  if (location?.manualLocation) return location.manualLocation;
  const coordinates = location?.coordinates;
  if (Number.isFinite(coordinates?.latitude) && Number.isFinite(coordinates?.longitude)) {
    return `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`;
  }
  return 'Location not available';
}
