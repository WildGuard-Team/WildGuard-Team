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

function getSeverityColor(severity) {
  const colors = {
    LOW: "#65a30d", // green
    MEDIUM: "#eab308", // yellow
    HIGH: "#f97316", // orange
    CRITICAL: "#dc2626", // red
  };

  return colors[String(severity ?? "").toUpperCase()] ?? "#16805b";
}

function getZoneColor(severity) {
  return getSeverityColor(severity);
}

function getMarkerColor(item) {
  if (!item.risk) {
    return "#16805b";
  }

  return getSeverityColor(item.severity);
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
                <strong>Sensor: {item.title}</strong>

                {item.severity && (
                  <p>
                    <strong>Risk Level:</strong> {item.severity}
                  </p>
                )}

                {item.description && <p>{item.description}</p>}

                <small>
                  Location: {formatCoordinate(item.location.latitude)},{" "}
                  {formatCoordinate(item.location.longitude)}
                </small>
              </Popup>
            </Circle>
          );
        })}

        {validLocations.map((item) => {
          const color = getMarkerColor(item);

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

                {item.severity && <p>Severity: {item.severity}</p>}

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
