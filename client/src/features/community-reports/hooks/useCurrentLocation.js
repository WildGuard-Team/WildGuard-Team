import { useCallback, useEffect, useRef, useState } from 'react';

export function useCurrentLocation() {
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const isMounted = useRef(true);
  const requestPending = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const requestCurrentLocation = useCallback(async () => {
    if (requestPending.current) return null;
    if (!navigator.geolocation) {
      if (isMounted.current) setLocationError('Your browser does not support location access. Select a point on the map or search manually.');
      return null;
    }
    requestPending.current = true;
    if (isMounted.current) {
      setIsLocating(true);
      setLocationError('');
    }
    try {
      return await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
          (positionError) => {
            const messages = {
              1: 'Location permission was denied. Select a point on the map or search manually.',
              2: 'Your current location is unavailable. Select a point on the map or search manually.',
              3: 'Location lookup timed out. Select a point on the map or search manually.',
            };
            if (isMounted.current) setLocationError(messages[positionError.code] ?? 'Unable to get your current location.');
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
        );
      });
    } finally {
      requestPending.current = false;
      if (isMounted.current) setIsLocating(false);
    }
  }, []);

  return { requestCurrentLocation, isLocating, locationError };
}
