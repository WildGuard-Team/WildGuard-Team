import {
  Circle,
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
} from "react-leaflet";

import {
  formatCoordinate,
  hasValidCoordinates,
} from "../utils/monitoringFormat.js";

import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [7.2906, 80.6337];

function getZoneColor(severity) {
  const colors = {
    MEDIUM: "#d48c22",
    HIGH: "#d74736",
    CRITICAL: "#9f1f18",
  };

  return colors[String(severity ?? "").toUpperCase()] ?? "#d74736";
}

export default function MonitoringMap({
  locations = [],
  zones = [],
  center = null,
  zoom = 12,
  height = 380,
}) {
  const validLocations = locations.filter((item) =>
    hasValidCoordinates(item.location),
  );

  const validZones = zones.filter(
    (zone) =>
      hasValidCoordinates(zone.center) &&
      Number.isFinite(Number(zone.radiusMeters)) &&
      Number(zone.radiusMeters) > 0,
  );

  const mapCenter = hasValidCoordinates(center)
    ? [center.latitude, center.longitude]
    : validLocations.length
      ? [
          validLocations[0].location.latitude,

          validLocations[0].location.longitude,
        ]
      : validZones.length
        ? [validZones[0].center.latitude, validZones[0].center.longitude]
        : DEFAULT_CENTER;

  return (
    <div className="wg-map-container" style={{ height }}>
      <MapContainer
        key={`${mapCenter[0]}-${mapCenter[1]}-${zoom}`}
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom
        style={{
          width: "100%",
          height: "100%",
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {validZones.map((zone) => {
          const color = getZoneColor(zone.severity);

          return (
            <Circle
              key={zone._id}
              center={[zone.center.latitude, zone.center.longitude]}
              radius={Number(zone.radiusMeters)}
              pathOptions={{
                color,
                fillColor: color,

                fillOpacity: 0.16,

                weight: 2,
              }}
            >
              <Popup>
                <strong>{zone.name}</strong>

                <p>Severity: {zone.severity}</p>

                <p>Radius: {zone.radiusMeters} m</p>

                {zone.description && <small>{zone.description}</small>}
              </Popup>
            </Circle>
          );
        })}

        {validLocations.map((item) => {
          const color = item.risk ? "#d74736" : "#16805b";

          return (
            <CircleMarker
              key={item.id}
              center={[item.location.latitude, item.location.longitude]}
              radius={item.risk ? 10 : 8}
              pathOptions={{
                color,
                fillColor: color,

                fillOpacity: 0.95,

                weight: 3,
              }}
            >
              <Popup>
                <strong>{item.title}</strong>

                {item.description && <p>{item.description}</p>}

                <small>
                  {formatCoordinate(item.location.latitude)},{" "}
                  {formatCoordinate(item.location.longitude)}
                </small>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
