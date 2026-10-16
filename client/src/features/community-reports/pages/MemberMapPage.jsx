import { useEffect, useRef, useState } from 'react';
import { Circle } from 'react-leaflet';
import CommunityLayout from '../components/CommunityLayout.jsx';
import CommunityIcon from '../components/CommunityIcon.jsx';
import LocationMap from '../components/LocationMap.jsx';
import './member-map.css';

const locationErrors = {
  1: 'Location permission was denied. Allow location access in your browser settings, then try again.',
  2: 'Your current location is unavailable. Check your device’s location services and try again.',
  3: 'Finding your location timed out. Try again, preferably where your device has a clearer signal.',
};

export default function MemberMapPage({ navigate }) {
  const [position, setPosition] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  const pending = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  function requestLocation() {
    if (pending.current) return;
    setError('');
    if (window.isSecureContext === false) {
      setError('Location access requires a secure connection. Open WildGuard using HTTPS or localhost, then try again.');
      return;
    }
    if (!navigator.geolocation) {
      setError('Your browser does not support location access. Try a browser with geolocation support. You can still explore the map.');
      return;
    }

    pending.current = true;
    setIsLocating(true);
    function finish() {
      pending.current = false;
      if (mounted.current) setIsLocating(false);
    }
    try {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          if (mounted.current) {
            setPosition({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy });
          }
          finish();
        },
        (failure) => {
          if (mounted.current) setError(locationErrors[failure.code] ?? 'Unable to get your current location. Please try again.');
          finish();
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    } catch {
      setError('Unable to access your location. Check your browser’s location permissions and secure connection, then try again.');
      finish();
    }
  }

  const hasAccuracy = Number.isFinite(position?.accuracy) && position.accuracy >= 0;

  return <CommunityLayout navigate={navigate} active="map">
    <div className="member-location-page">
      <header className="report-heading member-location-heading">
        <div><h1>My Location</h1><p>View your current location on the map.</p></div>
        <button className="primary-button" type="button" onClick={requestLocation} disabled={isLocating}>
          <CommunityIcon name="pin" size={20} />
          {isLocating ? 'Finding your location…' : 'Use My Current Location'}
        </button>
      </header>
      <p className="member-location-status" role="status">
        {isLocating ? 'Finding your location…' : position ? 'Your last requested location is shown below. Request again to update it.' : 'Use the button to show your location. You can pan and zoom the map.'}
      </p>
      {error && <p className="member-location-error" role="alert">{error}</p>}
      <section className="member-location-card" aria-label="Current location">
        <LocationMap coordinates={position} readOnly scrollWheelZoom locationLabel="Your current location">
          {hasAccuracy && <Circle center={[position.latitude, position.longitude]} radius={position.accuracy}
            pathOptions={{ color: '#087248', fillColor: '#008a5c', fillOpacity: 0.12, weight: 1 }} />}
        </LocationMap>
        {position && <dl className="member-location-info">
          <div><dt>Latitude</dt><dd>{position.latitude.toFixed(6)}</dd></div>
          <div><dt>Longitude</dt><dd>{position.longitude.toFixed(6)}</dd></div>
          <div><dt>Browser accuracy</dt><dd>{hasAccuracy ? `±${position.accuracy.toLocaleString(undefined, { maximumFractionDigits: 1 })} m` : 'Not provided'}</dd></div>
        </dl>}
      </section>
    </div>
  </CommunityLayout>;
}
