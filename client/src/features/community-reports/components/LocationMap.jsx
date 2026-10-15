import { useEffect } from 'react';
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
  return Number.isFinite(coordinates?.latitude) && Number.isFinite(coordinates?.longitude);
}

function MapSelection({ onMapSelect }) {
  useMapEvents({ click: (event) => onMapSelect({ latitude: event.latlng.lat, longitude: event.latlng.lng }) });
  return null;
}

function MapViewport({ coordinates }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 0);
    if (hasValidCoordinates(coordinates)) map.setView(coordinatesToPosition(coordinates), Math.max(map.getZoom(), 13));
    return () => clearTimeout(timer);
  }, [coordinates, map]);
  return null;
}

export default function LocationMap({ coordinates, onMapSelect, onMarkerDrag }) {
  const hasSelectedLocation = hasValidCoordinates(coordinates);
  const markerHandlers = {
    dragend(event) {
      const next = event.target.getLatLng();
      onMarkerDrag({ latitude: next.lat, longitude: next.lng });
    },
  };
  return <section className="location-map-region" aria-label="Interactive location map">
    <MapContainer center={coordinatesToPosition(hasSelectedLocation ? coordinates : sriLankaCenter)} zoom={hasSelectedLocation ? 13 : 7} scrollWheelZoom className="location-map">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapSelection onMapSelect={onMapSelect} />
      <MapViewport coordinates={coordinates} />
      {hasSelectedLocation && <Marker position={coordinatesToPosition(coordinates)} icon={selectedLocationIcon} draggable eventHandlers={markerHandlers}>
        <Tooltip direction="top" offset={[0, -36]}>Selected location</Tooltip>
      </Marker>}
    </MapContainer>
  </section>;
}
