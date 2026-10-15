import { monitoringApi } from "../services/monitoringApi.js";

import { useMonitoringResource } from "../hooks/useMonitoringResource.js";

import MonitoringMap from "../components/MonitoringMap.jsx";

import {
  PageHeading,
  Panel,
  DetailRow,
  StatusBadge,
  LoadingState,
  ErrorState,
  EmptyState,
} from "../components/MonitoringUI.jsx";

import {
  formatDate,
  formatCoordinate,
  formatLabel,
  hasValidCoordinates,
} from "../utils/monitoringFormat.js";

export default function ReadingDetailsPage({ readingId, navigate }) {
  const { data, loading, error, refresh } = useMonitoringResource(
    () => monitoringApi.getReading(readingId),
    [readingId],
  );

  if (loading && !data) {
    return <LoadingState />;
  }

  if (error && !data) {
    return <ErrorState message={error} onRetry={refresh} />;
  }

  const { reading, analysis, alerts = [] } = data;

  const zoneMetadata = analysis?.metadata;

  const zone =
    zoneMetadata?.zoneCenter && zoneMetadata?.zoneRadiusMeters
      ? {
          name: zoneMetadata.zoneName,
          center: zoneMetadata.zoneCenter,
          radiusMeters: zoneMetadata.zoneRadiusMeters,
        }
      : null;

  const locations = hasValidCoordinates(reading.location)
    ? [
        {
          id: reading._id,
          title: reading.sensorId,
          location: reading.location,
          description: analysis?.reason || "Sensor reading",
          risk: analysis?.riskDetected ?? false,
        },
      ]
    : [];

  return (
    <div className="wg-page">
      <button
        type="button"
        className="wg-back-link"
        onClick={() => navigate("/monitoring/data")}
      >
        ← Back to Monitoring Data
      </button>

      <PageHeading
        title="Reading Details & Risk Analysis"
        description={`Reading ID: ${reading._id}`}
        actions={<StatusBadge status={reading.validationStatus} />}
      />

      <div className="wg-details-grid">
        <Panel title="Reading Information">
          <div className="wg-detail-list">
            <DetailRow label="Sensor ID" value={reading.sensorId} />

            <DetailRow
              label="Sensor Type"
              value={formatLabel(reading.sensorType)}
            />

            <DetailRow
              label="Timestamp"
              value={formatDate(reading.timestamp)}
            />

            <DetailRow
              label="Latitude"
              value={formatCoordinate(reading.location?.latitude)}
            />

            <DetailRow
              label="Longitude"
              value={formatCoordinate(reading.location?.longitude)}
            />

            <DetailRow
              label="Processing"
              value={<StatusBadge status={reading.processingStatus} />}
            />
          </div>

          <div className="wg-reading-values">
            <h4>Sensor Values</h4>

            <pre>
              {JSON.stringify(reading.values ?? reading.rawData, null, 2)}
            </pre>
          </div>
        </Panel>

        <Panel title="Validation Results">
          <div className="wg-validation-header">
            <StatusBadge status={reading.validationStatus} />
          </div>

          {reading.validationStatus === "VALID" ? (
            <div className="wg-validation-success">
              <strong>✓ Validation Passed</strong>

              <p>The reading passed the configured sensor validation rules.</p>
            </div>
          ) : (
            <div className="wg-validation-error">
              <strong>Reading Rejected</strong>

              <p>The following validation errors were detected:</p>

              <ul>
                {reading.rejectionReasons?.map((reason) => (
                  <li key={reason}>{formatLabel(reason)}</li>
                ))}
              </ul>
            </div>
          )}

          <DetailRow
            label="Processing Status"
            value={formatLabel(reading.processingStatus)}
          />

          {reading.failureReason && (
            <p className="wg-error-text">
              {formatLabel(reading.failureReason)}
            </p>
          )}
        </Panel>
      </div>

      <Panel
        title="Risk Analysis"
        className="wg-large-risk-panel"
        action={analysis && <StatusBadge status={analysis.riskLevel} />}
      >
        {!analysis ? (
          <EmptyState
            title="Risk analysis unavailable"
            description={
              reading.processingStatus === "REJECTED"
                ? "This reading was rejected during validation."
                : "Analysis has not completed successfully."
            }
          />
        ) : (
          <>
            <div className="wg-analysis-grid">
              <div className="wg-analysis-map">
                <div className="wg-subsection-header">
                  <h4>Sensor Location & Risk Zone</h4>
                </div>

                <MonitoringMap
                  locations={locations}
                  center={reading.location}
                  zone={zone}
                  zoom={13}
                  height={440}
                />

                {zone && (
                  <div className="wg-map-legend">
                    <span className="wg-legend-risk" />
                    Configured high-risk zone boundary
                  </div>
                )}
              </div>

              <div className="wg-analysis-assessment">
                <p className="wg-overline">RISK ASSESSMENT</p>

                <div
                  className={`wg-risk-level ${
                    analysis.riskDetected ? "wg-risk-high" : "wg-risk-normal"
                  }`}
                >
                  {analysis.riskLevel}
                </div>

                <p className="wg-risk-description">{analysis.reason}</p>

                <div className="wg-detail-list">
                  <DetailRow
                    label="Risk Detected"
                    value={analysis.riskDetected ? "Yes" : "No"}
                  />

                  <DetailRow
                    label="Risk Type"
                    value={formatLabel(analysis.riskType)}
                  />

                  <DetailRow
                    label="Risk Zone"
                    value={analysis.metadata?.zoneName || "N/A"}
                  />

                  <DetailRow
                    label="Distance"
                    value={
                      analysis.distanceMeters != null
                        ? `${analysis.distanceMeters.toFixed(1)} m`
                        : "N/A"
                    }
                  />

                  <DetailRow
                    label="Analyzed At"
                    value={formatDate(analysis.createdAt)}
                  />
                </div>

                {reading.sensorType === "CAMERA_TRAP" && (
                  <div className="wg-camera-result">
                    <strong>Simulated Camera Analysis</strong>

                    <DetailRow
                      label="Detection"
                      value={analysis.metadata?.detection}
                    />

                    <DetailRow
                      label="Confidence"
                      value={
                        analysis.metadata?.confidence != null
                          ? `${(analysis.metadata.confidence * 100).toFixed(
                              1,
                            )}%`
                          : "N/A"
                      }
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="wg-analysis-footer">
              <div>
                <strong>Analysis Result</strong>

                <p>{analysis.reason}</p>
              </div>

              {alerts.length > 0 && (
                <button
                  type="button"
                  className="wg-btn wg-btn-primary"
                  onClick={() =>
                    navigate(`/monitoring/alerts/${alerts[0]._id}`)
                  }
                >
                  View Generated Alert →
                </button>
              )}
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
