import LocationMap from './LocationMap.jsx';

function hasValidReportCoordinates(coordinates) {
  return Number.isFinite(coordinates?.latitude)
    && Number.isFinite(coordinates?.longitude)
    && coordinates.latitude >= -90 && coordinates.latitude <= 90
    && coordinates.longitude >= -180 && coordinates.longitude <= 180;
}

export default function ReadOnlyReportMap({ coordinates }) {
  if (!hasValidReportCoordinates(coordinates)) return null;

  return <div className="report-details-map">
    <LocationMap coordinates={coordinates} readOnly />
  </div>;
}
