import { useEffect, useRef, useState } from 'react';

import IncidentLocationMap from './IncidentLocationMap.jsx';
import { formatFieldIncidentCoordinates, hasValidFieldIncidentCoordinates } from '../utils/field-incident-location.js';
import { parseCoordinates } from '../validation/field-incident-details.validation.js';
import './field-incident-location.css';

export default function FieldIncidentLocationFields({ location, error, onChange }) {
  const [locationMessage, setLocationMessage] = useState('');
  const [locationError, setLocationError] = useState('');
  const [isFindingLocation, setIsFindingLocation] = useState(false);
  const requestId = useRef(0);
  const coordinates = hasValidFieldIncidentCoordinates(location.coordinates)
    ? location.coordinates : parseCoordinates(location.manualCoordinates);

  useEffect(() => () => {
    // Browser geolocation cannot be cancelled, so ignore any late callback.
    requestId.current += 1;
  }, []);

  function updateLocationField(event) {
    const { name, value } = event.target;
    if (name === 'manualCoordinates') {
      requestId.current += 1;
      setIsFindingLocation(false);
      onChange({
        manualCoordinates: value,
        coordinates: parseCoordinates(value),
        source: 'MANUAL',
      });
    } else {
      onChange({ [name]: value });
    }
    setLocationMessage('');
    setLocationError('');
  }

  function selectLocation(nextCoordinates) {
    if (!hasValidFieldIncidentCoordinates(nextCoordinates)) return;
    requestId.current += 1;
    setIsFindingLocation(false);
    setLocationMessage('');
    setLocationError('');
    onChange({
      source: 'MANUAL',
      coordinates: nextCoordinates,
      manualCoordinates: formatFieldIncidentCoordinates(nextCoordinates),
    });
  }

  function clearLocation() {
    requestId.current += 1;
    setIsFindingLocation(false);
    setLocationMessage('');
    setLocationError('');
    onChange({ source: null, coordinates: null, manualCoordinates: '' });
  }

  function useCurrentLocation() {
    setLocationMessage('');
    setLocationError('');
    const currentRequest = ++requestId.current;
    if (!navigator.geolocation) {
      setIsFindingLocation(false);
      setLocationError(
        'GPS is unavailable in this browser. Click the map to choose a location, enter coordinates, or describe the location below.',
      );
      return;
    }

    setIsFindingLocation(true);

    function locationFailed(error) {
      if (currentRequest !== requestId.current) return;
      const reason = error?.code === 1
        ? 'Location permission was denied.'
        : error?.code === 3
          ? 'Finding your location took too long.'
          : 'Your current GPS location is unavailable.';
      setLocationError(`${reason} You can retry, click the map, enter coordinates, or describe the location below.`);
      setIsFindingLocation(false);
    }

    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (currentRequest !== requestId.current) return;
          const coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          if (!hasValidFieldIncidentCoordinates(coordinates)) {
            locationFailed();
            return;
          }
          onChange({
            source: 'GPS',
            coordinates,
            manualCoordinates: formatFieldIncidentCoordinates(coordinates),
          });
          setLocationMessage('Current GPS location captured successfully.');
          setIsFindingLocation(false);
        },
        locationFailed,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    } catch {
      locationFailed();
    }
  }

  return (
    <>
      <div className="field-incident-location-field">
        <label>
          <span>GPS Location (optional)</span>
          <div className="field-incident-gps-row">
            <input
              name="manualCoordinates"
              value={location.manualCoordinates ?? (coordinates ? formatFieldIncidentCoordinates(coordinates) : '')}
              onChange={updateLocationField}
              placeholder="Latitude, Longitude"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'field-incident-location-error' : undefined}
            />
            <button type="button" onClick={useCurrentLocation} disabled={isFindingLocation}>
              {isFindingLocation ? 'Finding...' : 'Use My Location'}
            </button>
          </div>
        </label>
        {locationMessage && <p className="field-location-message" role="status">{locationMessage}</p>}
        {locationError && <p className="field-incident-error" role="alert">{locationError}</p>}
        {error && <small className="field-incident-error" id="field-incident-location-error">{error}</small>}
      </div>

      <section className="field-incident-map-section field-incident-wide" aria-labelledby="field-incident-map-title">
        <div className="field-incident-map-heading">
          <h2 id="field-incident-map-title">Mark Incident Location</h2>
          <button type="button" className="field-incident-clear-location" onClick={clearLocation}
            disabled={!coordinates && !location.manualCoordinates && !isFindingLocation}>
            Clear Location
          </button>
        </div>
        <p className="field-incident-map-instruction">Click on the map to mark where the incident occurred.</p>
        <IncidentLocationMap
          latitude={coordinates?.latitude}
          longitude={coordinates?.longitude}
          readOnly={false}
          onLocationChange={selectLocation}
          variant="picker"
        />
      </section>

      <label className="field-incident-field field-incident-wide">
        <span>Location description</span>
        <textarea
          name="description"
          value={location.description}
          onChange={updateLocationField}
          placeholder="Describe where the incident occurred"
        />
      </label>
    </>
  );
}
