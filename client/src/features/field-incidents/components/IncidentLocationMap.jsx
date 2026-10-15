import { useMemo } from 'react';
import LocationMap from '../../community-reports/components/LocationMap.jsx';
import { hasValidFieldIncidentCoordinates } from '../utils/field-incident-location.js';
import './field-incident-location.css';

const yalaCenter = { latitude: 6.3725, longitude: 81.5169 };

export default function IncidentLocationMap({
  latitude,
  longitude,
  readOnly = true,
  onLocationChange,
  variant = 'review',
  showGoogleMapsLink = false,
  emptyMessage = 'No location selected',
}) {
  const coordinates = useMemo(() => (
    hasValidFieldIncidentCoordinates({ latitude, longitude }) ? { latitude, longitude } : null
  ), [latitude, longitude]);

  if (readOnly && !coordinates) {
    return (
      <div className="incident-location-map-empty" role="status">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  function selectLocation(nextCoordinates) {
    if (!readOnly && hasValidFieldIncidentCoordinates(nextCoordinates)) {
      onLocationChange?.(nextCoordinates);
    }
  }

  return (
    <div className={`incident-location-map incident-location-map--${variant}`}>
      <LocationMap
        coordinates={coordinates}
        onMapSelect={selectLocation}
        onMarkerDrag={selectLocation}
        readOnly={readOnly}
        defaultCenter={yalaCenter}
        defaultZoom={10}
        className="field-incident-map"
        showTileStatus
      />
      <p className="field-incident-map-coordinates" role="status">
        {coordinates
          ? <><span>Latitude: {coordinates.latitude.toFixed(6)}</span><span>Longitude: {coordinates.longitude.toFixed(6)}</span></>
          : 'No location selected. GPS is optional; you can describe the location below.'}
      </p>
      {showGoogleMapsLink && coordinates && (
        <a className="incident-location-google-maps"
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${coordinates.latitude},${coordinates.longitude}`)}`}
          target="_blank" rel="noopener noreferrer"
          aria-label="Open incident location in Google Maps (opens in a new tab)">
          Open in Google Maps
        </a>
      )}
    </div>
  );
}
