import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import locationMarkerUrl from '../../../assets/icons/map-location-marker.svg';
import ManagerIcon from '../components/ManagerIcon.jsx';
import ParkManagerLayout from '../components/ParkManagerLayout.jsx';
import { searchParkLocations } from '../services/conservation-report.api.js';
import './conservation-reports.css';
import './manager-tools.css';

const sriLankaCenter = { latitude: 7.8731, longitude: 80.7718 };
const markerIcon = L.icon({ iconUrl: locationMarkerUrl, iconRetinaUrl: locationMarkerUrl, iconSize: [38, 46], iconAnchor: [19, 46], tooltipAnchor: [0, -38], className: 'wildguard-location-marker' });
const popularParks = ['Yala National Park', 'Wilpattu National Park', 'Udawalawe National Park'];

export default function ParkMapPage({ navigate }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState('');
  const requestId = useRef(0);

  useEffect(() => {
    const term = query.trim();
    if (selected?.displayName === query) return undefined;
    if (term.length < 3) return undefined;
    const currentRequest = ++requestId.current;
    const timer = setTimeout(() => {
      setSearching(true); setMessage('');
      searchParkLocations(term)
        .then((payload) => { if (requestId.current === currentRequest) { setResults(payload.results ?? []); if (!(payload.results ?? []).length) setMessage('No matching locations found. Try a nearby landmark or district.'); } })
        .catch((error) => { if (requestId.current === currentRequest) { setResults([]); setMessage(error.message); } })
        .finally(() => { if (requestId.current === currentRequest) setSearching(false); });
    }, 450);
    return () => clearTimeout(timer);
  }, [query, selected?.displayName]);

  function chooseLocation(location) {
    setSelected(location); setQuery(location.displayName); setResults([]); setSearching(false); setMessage('');
  }

  function updateQuery(value) {
    requestId.current += 1;
    setQuery(value); setResults([]); setSearching(false); setMessage('');
  }

  function useLiveLocation() {
    if (!navigator.geolocation) { setMessage('Live location is not supported by this browser.'); return; }
    setLocating(true); setMessage(''); setResults([]);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setSelected({ placeId: 'live-location', displayName: 'Your live location', coordinates: { latitude: coords.latitude, longitude: coords.longitude } }); setQuery(''); setLocating(false); },
      () => { setMessage('Unable to access your live location. Check browser location permission and try again.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }

  const coordinates = selected?.coordinates ?? sriLankaCenter;
  const coordinateText = useMemo(() => selected ? `${selected.coordinates.latitude.toFixed(5)}, ${selected.coordinates.longitude.toFixed(5)}` : 'Search for a park or use live location', [selected]);

  return <ParkManagerLayout navigate={navigate}>
    <div className="manager-tool-page manager-map-page">
      <header className="manager-tool-heading manager-map-heading">
        <div><span>Operations / Park Map</span><h1>Explore protected areas</h1><p>Search live OpenStreetMap locations, inspect park surroundings and centre the map on your current position.</p></div>
        <button type="button" onClick={() => navigate('/manager/reports')}>Open report workspace <ManagerIcon name="chevron" size={17} /></button>
      </header>

      <section className="manager-map-shell">
        <div className="manager-map-sidebar">
          <div className="manager-map-search">
            <label htmlFor="manager-park-search">Search parks and locations</label>
            <div><ManagerIcon name="map" size={20} /><input id="manager-park-search" value={query} onChange={(event) => updateQuery(event.target.value)} placeholder="Try Yala, Wilpattu or a landmark" autoComplete="off" /><span>{searching ? 'Searching…' : query && 'Live'}</span></div>
            {results.length > 0 && <ul>{results.map((result) => <li key={result.placeId}><button type="button" onClick={() => chooseLocation(result)}><strong>{result.displayName.split(',')[0]}</strong><span>{result.displayName}</span></button></li>)}</ul>}
            <p className={message ? 'is-visible' : ''} role="status">{message}</p>
          </div>

          <button className="manager-live-location" type="button" onClick={useLiveLocation} disabled={locating}><span><ManagerIcon name="map" size={21} /></span><span><strong>{locating ? 'Finding your location…' : 'Use my live location'}</strong><small>Requires browser location permission</small></span></button>

          <div className="manager-popular-parks"><span>Popular protected areas</span>{popularParks.map((park) => <button type="button" key={park} onClick={() => updateQuery(park)}>{park}<ManagerIcon name="chevron" size={15} /></button>)}</div>

          <div className={`manager-map-selection${selected ? ' has-selection' : ''}`}><span><ManagerIcon name="map" size={20} /></span><div><small>{selected ? 'Selected location' : 'Map ready'}</small><strong>{selected?.displayName ?? 'Sri Lanka protected-area view'}</strong><p>{coordinateText}</p></div></div>
        </div>

        <div className="manager-map-canvas" aria-label="Interactive park map">
          <MapContainer center={[coordinates.latitude, coordinates.longitude]} zoom={selected ? 13 : 7} scrollWheelZoom>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapViewport coordinates={coordinates} zoom={selected ? 13 : 7} />
            {selected && <Marker position={[coordinates.latitude, coordinates.longitude]} icon={markerIcon}><Tooltip direction="top" offset={[0, -38]}>{selected.displayName}</Tooltip></Marker>}
          </MapContainer>
          <div className="manager-map-overlay"><span><i /> Live map</span><strong>OpenStreetMap</strong></div>
        </div>
      </section>
    </div>
  </ParkManagerLayout>;
}

function MapViewport({ coordinates, zoom }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => { map.invalidateSize(); map.flyTo([coordinates.latitude, coordinates.longitude], zoom, { duration: .8 }); }, 0);
    return () => clearTimeout(timer);
  }, [coordinates, map, zoom]);
  return null;
}
