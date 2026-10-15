import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import locationMarkerUrl from '../../../assets/icons/map-location-marker.svg';

const sriLankaCenter = { latitude: 7.8731, longitude: 80.7718 };
const selectedLocationIcon = L.icon({
  iconUrl: locationMarkerUrl,
  iconRetinaUrl: locationMarkerUrl,
  iconSize: [36, 44],
  iconAnchor: [18, 44],
  popupAnchor: [0, -40],
  tooltipAnchor: [0, -36],
  className: 'wildguard-location-marker',
});

function coordinatesToPosition(coordinates) {
  return [coordinates.latitude, coordinates.longitude];
}

function hasValidCoordinates(coordinates) {
  return Number.isFinite(coordinates?.latitude) && Math.abs(coordinates.latitude) <= 90
    && Number.isFinite(coordinates?.longitude) && Math.abs(coordinates.longitude) <= 180;
}

function selectedCoordinates(latlng) {
  // A panned map can show another copy of the world; keep saved longitude in range.
  const wrapped = latlng.wrap();
  return { latitude: wrapped.lat, longitude: wrapped.lng };
}

function MapSelection({ onMapSelect }) {
  useMapEvents({ click: (event) => onMapSelect(selectedCoordinates(event.latlng)) });
  return null;
}

function MapViewport({ coordinates, readOnly }) {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const dialog = container.closest('dialog');
    let resizeFrame;
    function refreshSize() {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        // A dialog can mount its map before showModal() makes its size available.
        if (container.clientWidth && container.clientHeight) {
          map.invalidateSize({ pan: true, animate: false, debounceMoveend: true });
        }
      });
    }
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(refreshSize);
    observer?.observe(container);
    const dialogObserver = dialog && typeof MutationObserver !== 'undefined'
      ? new MutationObserver(refreshSize) : null;
    dialogObserver?.observe(dialog, { attributes: true, attributeFilter: ['open'] });
    window.addEventListener('resize', refreshSize);
    document.addEventListener('visibilitychange', refreshSize);
    refreshSize();
    return () => {
      cancelAnimationFrame(resizeFrame);
      observer?.disconnect();
      dialogObserver?.disconnect();
      window.removeEventListener('resize', refreshSize);
      document.removeEventListener('visibilitychange', refreshSize);
    };
  }, [map]);
  useEffect(() => {
    if (hasValidCoordinates(coordinates)) map.setView(coordinatesToPosition(coordinates), Math.max(map.getZoom(), 13));
  }, [coordinates, map]);
  useEffect(() => {
    if (readOnly) map.scrollWheelZoom.disable();
    else map.scrollWheelZoom.enable();
  }, [map, readOnly]);
  return null;
}

export default function LocationMap({
  coordinates,
  onMapSelect,
  onMarkerDrag,
  defaultCenter = sriLankaCenter,
  defaultZoom = 7,
  className = '',
  showTileStatus = false,
  readOnly = false,
}) {
  const [tileStatus, setTileStatus] = useState('loading');
  const tileFailed = useRef(false);
  const hasSelectedLocation = hasValidCoordinates(coordinates);
  useEffect(() => {
    if (!showTileStatus || tileStatus !== 'loading') return;
    const timer = setTimeout(() => setTileStatus('error'), 15000);
    return () => clearTimeout(timer);
  }, [showTileStatus, tileStatus]);
  const tileHandlers = {
    loading() {
      tileFailed.current = false;
      setTileStatus('loading');
    },
    tileerror() {
      tileFailed.current = true;
      setTileStatus('error');
    },
    load() {
      setTileStatus(tileFailed.current ? 'error' : 'ready');
    },
  };
  const markerHandlers = {
    dragend(event) {
      if (!readOnly) onMarkerDrag?.(selectedCoordinates(event.target.getLatLng()));
    },
  };
  return <div className={`location-map-region ${className}`} role="region" aria-label={readOnly ? 'Incident location map' : 'Interactive location map'}>
    {showTileStatus && tileStatus !== 'ready' && (
      <p className={`location-map-status${tileStatus === 'error' ? ' is-error' : ''}`} role="status">
        {tileStatus === 'error'
          ? readOnly
            ? 'Some map tiles could not load. Check your connection. The incident coordinates are shown below.'
            : 'Some map tiles could not load. Check your connection or enter GPS coordinates above. Your selected location is kept.'
          : readOnly ? 'Loading incident location map…' : 'Loading map…'}
      </p>
    )}
    <MapContainer center={coordinatesToPosition(hasSelectedLocation ? coordinates : defaultCenter)} zoom={hasSelectedLocation ? 13 : defaultZoom} scrollWheelZoom={!readOnly} zoomControl className="location-map">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} eventHandlers={tileHandlers} />
      {!readOnly && <MapSelection onMapSelect={onMapSelect} />}
      <MapViewport coordinates={coordinates} readOnly={readOnly} />
      {hasSelectedLocation && <Marker position={coordinatesToPosition(coordinates)} icon={selectedLocationIcon} draggable={!readOnly} keyboard={!readOnly} eventHandlers={readOnly ? undefined : markerHandlers} title={readOnly ? 'Incident location' : 'Selected incident location. Drag to adjust.'} alt="Selected incident location" autoPan={!readOnly}>
        <Tooltip direction="top" offset={[0, -36]}>Selected location</Tooltip>
      </Marker>}
    </MapContainer>
  </div>;
}
