const sourceLabels = { GPS: 'Current GPS Location', MAP: 'Selected on Map', MANUAL: 'Entered Manually' };

export default function SelectedLocation({ location, error, warning }) {
  const coordinates = location.coordinates;
  const coordinateText = coordinates
    ? `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`
    : 'No location selected yet';
  const readableLocation = location.displayName || location.manualLocation;
  const locationText = readableLocation || (location.source === 'MANUAL' ? 'Manual location selected' : coordinateText);
  return <div className={coordinates ? 'selected-location' : 'selected-location is-empty'} aria-live="polite">
    <span aria-hidden="true">⌖</span>
    <div><small>{location.source ? sourceLabels[location.source] : 'Selected location'}</small><strong>{locationText}</strong></div>
    {warning && <p className="location-warning">{warning}</p>}
    {error && <p className="location-error">{error}</p>}
  </div>;
}
