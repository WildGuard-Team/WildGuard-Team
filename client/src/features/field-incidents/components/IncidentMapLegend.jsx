export default function IncidentMapLegend() {
  return (
    <div className="ranger-map-legend" aria-label="Map legend">
      <span className="ranger-map-legend-title">Map legend</span>
      <ul>
        <li><span className="ranger-map-legend-symbol is-submitted" aria-hidden="true" />Submitted</li>
        <li><span className="ranger-map-legend-symbol is-pending" aria-hidden="true" />Pending sync</li>
        <li><span className="ranger-map-legend-symbol is-high-risk" aria-hidden="true">!</span>High risk</li>
        <li><span className="ranger-map-legend-symbol is-current" aria-hidden="true" />Current location</li>
      </ul>
    </div>
  );
}
