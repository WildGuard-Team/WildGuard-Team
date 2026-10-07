import { useState } from "react";

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
} from "../components/MonitoringUI.jsx";

import {
  formatDate,
  formatLabel,
  hasValidCoordinates,
} from "../utils/monitoringFormat.js";

export default function AlertDetailsPage({ alertId, navigate }) {
  const [retrying, setRetrying] = useState(false);
  const [message, setMessage] = useState("");

  const {
    data: alert,
    loading,
    error,
    refresh,
  } = useMonitoringResource(() => monitoringApi.getAlert(alertId), [alertId]);

  async function retryDelivery() {
    setRetrying(true);
    setMessage("");

    try {
      const result = await monitoringApi.retryAlert(alertId);

      setMessage(`Delivery status: ${result.alert.deliveryStatus}`);

      refresh();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setRetrying(false);
    }
  }

  if (loading && !alert) {
    return <LoadingState />;
  }

  if (error && !alert) {
    return <ErrorState message={error} onRetry={refresh} />;
  }

  const locations = hasValidCoordinates(alert.location)
    ? [
        {
          id: alert._id,
          title: formatLabel(alert.type),
          description: alert.message,
          location: alert.location,
          risk: true,
        },
      ]
    : [];

  const attempts = alert.deliveryAttempts ?? [];

  return (
    <div className="wg-page">
      <button
        type="button"
        className="wg-back-link"
        onClick={() => navigate("/monitoring/alerts")}
      >
        ← Back to Alerts
      </button>

      <PageHeading
        title="Alert Details"
        description={`Alert ID: ${alert._id}`}
        actions={<StatusBadge status={alert.severity} />}
      />

      <div className="wg-details-grid">
        <Panel title="Alert Information">
          <div className="wg-detail-list">
            <DetailRow label="Sensor ID" value={alert.sensorId} />

            <DetailRow label="Alert Type" value={formatLabel(alert.type)} />

            <DetailRow
              label="Severity"
              value={<StatusBadge status={alert.severity} />}
            />

            <DetailRow
              label="Delivery"
              value={<StatusBadge status={alert.deliveryStatus} />}
            />

            <DetailRow label="Recipient" value={formatLabel(alert.recipient)} />

            <DetailRow
              label="Generated At"
              value={formatDate(alert.createdAt)}
            />
          </div>

          <div className="wg-alert-description">
            <h4>Risk Description</h4>
            <p>{alert.message}</p>
          </div>
        </Panel>

        <Panel title="Risk Location">
          <MonitoringMap
            locations={locations}
            center={alert.location}
            height={360}
            zoom={13}
          />
        </Panel>
      </div>

      <Panel title="Delivery History">
        {attempts.length === 0 ? (
          <p>No delivery attempts recorded.</p>
        ) : (
          <div className="wg-timeline">
            {attempts.map((attempt, index) => (
              <div
                key={`${attempt.attemptedAt}-${index}`}
                className="wg-timeline-item"
              >
                <span
                  className={`wg-timeline-dot ${
                    attempt.success
                      ? "wg-timeline-success"
                      : "wg-timeline-failed"
                  }`}
                />

                <div>
                  <strong>Delivery Attempt #{index + 1}</strong>

                  <p>
                    {attempt.success
                      ? "Delivery Successful"
                      : "Delivery Failed"}
                  </p>

                  <small>{formatDate(attempt.attemptedAt)}</small>

                  {attempt.error && (
                    <p className="wg-error-text">
                      {formatLabel(attempt.error)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {alert.deliveryStatus === "PENDING" && (
          <button
            type="button"
            className="wg-btn wg-btn-primary"
            onClick={retryDelivery}
            disabled={retrying}
          >
            {retrying ? "Retrying..." : "↻ Retry Alert Delivery"}
          </button>
        )}

        {message && (
          <p role="status" className="wg-info">
            {message}
          </p>
        )}
      </Panel>
    </div>
  );
}
