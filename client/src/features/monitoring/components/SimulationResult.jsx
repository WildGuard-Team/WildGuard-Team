import MonitoringMap from "./MonitoringMap.jsx";
import { formatLabel, formatDate } from "../utils/monitoringFormat.js";

function ResultMetric({ label, value, tone = "" }) {
  return (
    <article className={`simulation-result-item ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export default function SimulationResult({ result, zones = [] }) {
  if (!result) {
    return null;
  }

  const { sensor, reading, analysis, alert } = result;

  const locations = reading?.location
    ? [
        {
          id: reading._id,

          title: reading.sensorId,

          description: analysis?.reason ?? "Processed sensor reading",

          location: reading.location,

          risk: Boolean(analysis?.riskDetected),
        },
      ]
    : [];

  const matchedZones = analysis?.zoneId
    ? zones.filter((zone) => String(zone._id) === String(analysis.zoneId))
    : [];

  return (
    <article className="simulation-result-card">
      <div className="monitoring-section-heading">
        <div>
          <h2>Processing Result</h2>

          <p>Validation, risk analysis, alert and delivery result.</p>
        </div>

        {analysis?.riskDetected && (
          <span className="wg-badge wg-badge-danger">RISK DETECTED</span>
        )}
      </div>

      <div className="simulation-result-grid">
        <ResultMetric
          label="Sensor"
          value={sensor?.sensorId ?? reading?.sensorId ?? "N/A"}
        />

        <ResultMetric
          label="Validation"
          value={reading?.validationStatus ?? "N/A"}
        />

        <ResultMetric
          label="Processing"
          value={reading?.processingStatus ?? "N/A"}
        />

        <ResultMetric
          label="Risk Level"
          value={analysis?.riskLevel ?? "NONE"}
        />
      </div>

      {analysis && (
        <section
          className={
            analysis.riskDetected
              ? "simulation-alert-created"
              : "simulation-safe"
          }
        >
          <strong>
            {analysis.riskDetected ? "⚠ Risk Detected" : "✓ No Risk Detected"}
          </strong>

          <p>{analysis.reason}</p>

          {analysis.riskType && (
            <small>Type: {formatLabel(analysis.riskType)}</small>
          )}

          {analysis.distanceMeters != null && (
            <small>
              Distance from risk zone centre: {analysis.distanceMeters} m
            </small>
          )}
        </section>
      )}

      <div
        style={{
          marginTop: 20,
        }}
      >
        <MonitoringMap
          locations={locations}
          zones={matchedZones}
          center={reading?.location}
          zoom={analysis?.riskDetected ? 14 : 12}
          height={400}
        />
      </div>

      {alert ? (
        <section className="simulation-alert-created">
          <strong>Alert Generated</strong>

          <p>{alert.message}</p>

          <div className="wg-detail-list">
            <div className="wg-detail-row">
              <span>Alert Type</span>

              <strong>{formatLabel(alert.type)}</strong>
            </div>

            <div className="wg-detail-row">
              <span>Severity</span>

              <strong>{alert.severity}</strong>
            </div>

            <div className="wg-detail-row">
              <span>Recipient</span>

              <strong>{formatLabel(alert.recipient)}</strong>
            </div>

            <div className="wg-detail-row">
              <span>Delivery</span>

              <strong>{alert.deliveryStatus}</strong>
            </div>

            <div className="wg-detail-row">
              <span>Delivered At</span>

              <strong>{formatDate(alert.deliveredAt)}</strong>
            </div>
          </div>
        </section>
      ) : (
        <section className="simulation-safe">
          <strong>No Alert Required</strong>

          <p>
            Reading was processed successfully without generating a risk alert.
          </p>
        </section>
      )}
    </article>
  );
}
