import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { LocateFixed, MapPinned } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { FIELD_INCIDENT_PENDING_SYNC } from '../config/field-incident.constants.js';
import useRangerMapLocation from '../hooks/useRangerMapLocation.js';
import { getIncidentMapPosition, incidentMapKey } from '../utils/field-incident-map.js';
import { fieldIncidentTypeLabel } from '../utils/field-incident-options.js';
import IncidentMapLegend from './IncidentMapLegend.jsx';
import IncidentMapPopup from './IncidentMapPopup.jsx';
import './ranger-incident-map.css';

const sriLankaCenter = [7.8731, 80.7718];
const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// These four icon templates are fixed markup. Incident text is rendered by React in the popup.
const markerIcons = {
  submitted: L.divIcon({
    className: 'ranger-map-marker is-submitted',
    html: '<span class="ranger-map-marker__pin"></span>',
    iconSize: [36, 40], iconAnchor: [18, 36], popupAnchor: [0, -31],
  }),
  pending: L.divIcon({
    className: 'ranger-map-marker is-pending',
    html: '<span class="ranger-map-marker__pin"></span>',
    iconSize: [36, 40], iconAnchor: [18, 36], popupAnchor: [0, -31],
  }),
  submittedHigh: L.divIcon({
    className: 'ranger-map-marker is-submitted is-high-risk',
    html: '<span class="ranger-map-marker__pin"></span><span class="ranger-map-marker__risk" aria-hidden="true">!</span>',
    iconSize: [36, 40], iconAnchor: [18, 36], popupAnchor: [0, -31],
  }),
  pendingHigh: L.divIcon({
    className: 'ranger-map-marker is-pending is-high-risk',
    html: '<span class="ranger-map-marker__pin"></span><span class="ranger-map-marker__risk" aria-hidden="true">!</span>',
    iconSize: [36, 40], iconAnchor: [18, 36], popupAnchor: [0, -31],
  }),
};

function incidentMarkerLabel(incident) {
  const status = incident.status === FIELD_INCIDENT_PENDING_SYNC ? 'Pending synchronization' : 'Submitted';
  const reference = incident.status === FIELD_INCIDENT_PENDING_SYNC ? '' : incident.referenceNumber;
  return [fieldIncidentTypeLabel(incident.incidentType) || 'Field incident', reference, status,
    incident.riskLevel === 'HIGH' ? 'High risk' : ''].filter(Boolean).join(' · ');
}

function fitIncidentPositions(map, serializedPositions) {
  const positions = JSON.parse(serializedPositions);
  if (positions.length === 1) map.setView(positions[0], 13);
  else if (positions.length > 1) map.fitBounds(positions, { padding: [40, 40], maxZoom: 14 });
  else map.setView(sriLankaCenter, 7);
}

function IncidentViewport({ serializedPositions }) {
  const map = useMap();
  useEffect(() => {
    fitIncidentPositions(map, serializedPositions);
  }, [map, serializedPositions]);
  return null;
}

function MapSizeObserver({ serializedPositions, currentPosition }) {
  const map = useMap();
  const previousSize = useRef(null);
  useEffect(() => {
    const container = map.getContainer();
    let resizeFrame;
    function refreshSize() {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        if (container.clientWidth && container.clientHeight) {
          const size = [container.clientWidth, container.clientHeight];
          const hasResized = previousSize.current
            && (size[0] !== previousSize.current[0] || size[1] !== previousSize.current[1]);
          previousSize.current = size;
          map.invalidateSize({ pan: false, animate: false, debounceMoveend: true });
          if (hasResized) {
            if (currentPosition) map.setView(currentPosition, map.getZoom());
            else fitIncidentPositions(map, serializedPositions);
          }
        }
      });
    }
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(refreshSize);
    observer?.observe(container);
    window.addEventListener('resize', refreshSize);
    document.addEventListener('visibilitychange', refreshSize);
    refreshSize();
    return () => {
      cancelAnimationFrame(resizeFrame);
      observer?.disconnect();
      window.removeEventListener('resize', refreshSize);
      document.removeEventListener('visibilitychange', refreshSize);
    };
  }, [map, serializedPositions, currentPosition]);
  return null;
}

function CurrentLocation({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 14);
  }, [map, position]);
  if (!position) return null;
  return (
    <CircleMarker center={position} radius={8}
      pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#2877d3', fillOpacity: 1 }}>
      <Popup><p className="ranger-map-current-location">Your current location</p></Popup>
    </CircleMarker>
  );
}

export default function RangerIncidentMap({
  incidents = [], onViewIncident, onReport, isLoading = false, hasLoadError = false, hasActiveFilters = false,
}) {
  const { position, isLocating, error: locationError, requestLocation } = useRangerMapLocation();
  const [tileStatus, setTileStatus] = useState('loading');
  const tileFailed = useRef(false);
  const markers = incidents.map((incident) => ({ incident, position: getIncidentMapPosition(incident) }))
    .filter((marker) => marker.position);
  // Sorting coordinates avoids reframing after a data refresh that only changes record order or status.
  const serializedPositions = JSON.stringify(markers.map((marker) => marker.position)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]));

  useEffect(() => {
    if (tileStatus !== 'loading') return;
    const timer = setTimeout(() => setTileStatus('error'), 15000);
    return () => clearTimeout(timer);
  }, [tileStatus]);

  const tileHandlers = useMemo(() => ({
    loading() {
      tileFailed.current = false;
      setTileStatus('loading');
    },
    tileerror() {
      tileFailed.current = true;
      setTileStatus('error');
    },
    load() { setTileStatus(tileFailed.current ? 'error' : 'ready'); },
  }), []);
  const showEmpty = markers.length === 0 && !position && !isLoading && !hasLoadError;

  return (
    <section className="ranger-incident-map" aria-label="Incident map">
      <div className="ranger-map-toolbar">
        <div className="ranger-map-toolbar-copy">
          <MapPinned size={20} aria-hidden="true" />
          <span>Incident locations</span>
          <small>Pan or zoom to explore</small>
        </div>
        <button className="ranger-map-location-button" type="button" disabled={isLocating}
          onClick={requestLocation} aria-busy={isLocating}>
          <LocateFixed size={17} aria-hidden="true" />{isLocating ? 'Locating…' : 'My Location'}
        </button>
      </div>
      {locationError && <p className="ranger-map-location-message" role="status">{locationError}</p>}
      <div className="ranger-map-canvas-wrap" role="region" aria-label="Read-only field incident locations">
        <MapContainer center={sriLankaCenter} zoom={7} scrollWheelZoom={false} zoomControl
          className="ranger-map-canvas">
          <TileLayer attribution={tileAttribution} url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19} eventHandlers={tileHandlers} />
          <IncidentViewport serializedPositions={serializedPositions} />
          <MapSizeObserver serializedPositions={serializedPositions} currentPosition={position} />
          {markers.map(({ incident, position: incidentPosition }) => {
            const markerStatus = incident.status === FIELD_INCIDENT_PENDING_SYNC ? 'pending' : 'submitted';
            const icon = markerIcons[`${markerStatus}${incident.riskLevel === 'HIGH' ? 'High' : ''}`];
            const label = incidentMarkerLabel(incident);
            // Leaflet applies title/alt at creation, so a label change must replace the marker.
            return (
              <Marker key={`${incidentMapKey(incident)}:${label}`} position={incidentPosition} icon={icon}
                draggable={false} keyboard title={label} alt={label}>
                <Popup minWidth={230} maxWidth={300}>
                  <IncidentMapPopup incident={incident} onViewIncident={onViewIncident} />
                </Popup>
              </Marker>
            );
          })}
          <CurrentLocation position={position} />
        </MapContainer>
        {tileStatus !== 'ready' && (
          <p className={`ranger-map-tile-status${tileStatus === 'error' ? ' is-error' : ''}`} role="status">
            {tileStatus === 'error'
              ? 'Some map tiles could not load. Check your connection. Your incident markers are still available.'
              : 'Loading map…'}
          </p>
        )}
        {showEmpty && (
          <div className="ranger-map-empty" role="status">
            <span className="ranger-map-empty-icon"><MapPinned size={25} aria-hidden="true" /></span>
            <h3>{hasActiveFilters ? 'No incidents match these filters.' : 'No mapped incidents yet.'}</h3>
            <p>{hasActiveFilters
              ? 'Try adjusting your filters to show more incident locations.'
              : 'Incidents reported with GPS coordinates will appear here.'}</p>
            {!hasActiveFilters && onReport && (
              <button type="button" className="ranger-map-report-button" onClick={onReport}>Report Field Incident</button>
            )}
          </div>
        )}
      </div>
      <IncidentMapLegend />
    </section>
  );
}
