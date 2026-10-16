import { useCallback, useEffect, useRef, useState } from 'react';
import { hasValidFieldIncidentCoordinates } from '../utils/field-incident-location.js';

function locationErrorMessage(error) {
  if (error?.code === 1) return 'Location permission was denied.';
  if (error?.code === 3) return 'Finding your location timed out. Please try again.';
  return 'Your location is unavailable. You can still explore the incident map.';
}

export default function useRangerMapLocation() {
  const [position, setPosition] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(false);
  const requestPending = useRef(false);
  const requestGeneration = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestPending.current = false;
      requestGeneration.current += 1;
    };
  }, []);

  const requestLocation = useCallback(() => {
    if (!mounted.current || requestPending.current) return;
    if (!globalThis.navigator?.geolocation?.getCurrentPosition) {
      setError('Location is not supported by this browser. You can still explore the incident map.');
      return;
    }

    requestPending.current = true;
    const generation = ++requestGeneration.current;
    setIsLocating(true);
    setError('');

    function finishRequest() {
      if (!mounted.current || !requestPending.current || generation !== requestGeneration.current) return false;
      requestPending.current = false;
      setIsLocating(false);
      return true;
    }

    try {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          if (!finishRequest()) return;
          if (hasValidFieldIncidentCoordinates(coords)) setPosition([coords.latitude, coords.longitude]);
          else setError('Your location is unavailable. You can still explore the incident map.');
        },
        (locationError) => {
          if (finishRequest()) setError(locationErrorMessage(locationError));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      );
    } catch {
      if (finishRequest()) {
        setError('Your location is unavailable. You can still explore the incident map.');
      }
    }
  }, []);

  return { position, isLocating, error, requestLocation };
}
