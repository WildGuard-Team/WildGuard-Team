import { useEffect, useRef, useState } from 'react';

import { formatFieldIncidentCoordinates } from '../utils/field-incident-location.js';
import { parseCoordinates } from '../validation/field-incident-details.validation.js';

export default function FieldIncidentLocationFields({ location, error, onChange }) {
  const [locationMessage, setLocationMessage] = useState('');
  const [isFindingLocation, setIsFindingLocation] = useState(false);
  const requestId = useRef(0);

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
  }

  function useCurrentLocation() {
    setLocationMessage('');
    if (!navigator.geolocation) {
      setLocationMessage(
        'GPS location is not supported by this browser. Enter the coordinates or location description manually.',
      );
      return;
    }

    const currentRequest = ++requestId.current;
    setIsFindingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (currentRequest !== requestId.current) return;
        const coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        onChange({
          source: 'GPS',
          coordinates,
          manualCoordinates: formatFieldIncidentCoordinates(coordinates),
        });
        setLocationMessage('Current GPS location captured successfully.');
        setIsFindingLocation(false);
      },
      () => {
        if (currentRequest !== requestId.current) return;
        setLocationMessage(
          'Unable to get your current GPS location. You can retry or enter the location manually.',
        );
        setIsFindingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  return (
    <>
      <div className="field-incident-location-field">
        <label>
          <span>GPS Location (optional)</span>
          <div className="field-incident-gps-row">
            <input
              name="manualCoordinates"
              value={location.manualCoordinates}
              onChange={updateLocationField}
              placeholder="Latitude, Longitude"
            />
            <button type="button" onClick={useCurrentLocation} disabled={isFindingLocation}>
              {isFindingLocation ? 'Finding...' : 'Use My Location'}
            </button>
          </div>
        </label>
        {locationMessage && <p className="field-location-message">{locationMessage}</p>}
        {error && <small className="field-incident-error">{error}</small>}
      </div>

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
