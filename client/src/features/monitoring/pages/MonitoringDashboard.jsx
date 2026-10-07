import { useEffect, useState } from "react";

import { monitoringApi } from "../services/monitoringApi.js";

import MonitoringMap from "../components/MonitoringMap.jsx";

import {
  PageHeading,
  Panel,
  StatCard,
  StatusBadge,
  DataTable,
  EmptyState,
  LoadingState,
  ErrorState,
} from "../components/MonitoringUI.jsx";

import { formatDate, formatNumber } from "../utils/monitoringFormat.js";

async function loadDashboard() {
  const [counts, sensors, readings, alerts, zones] = await Promise.all([
    monitoringApi.getDashboard(),
    monitoringApi.getSensors(),
    monitoringApi.getReadings(),
    monitoringApi.getAlerts(),
    monitoringApi.getRiskZones(),
  ]);

  return {
    counts,
    sensors,
    readings,
    alerts,
    zones,
  };
}

export default function MonitoringDashboard({ navigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result = await loadDashboard();

        if (active) {
          setData(result);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    const timer = window.setInterval(load, 30000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  if (loading && !data) {
    return <LoadingState />;
  }

  if (error && !data) {
    return <ErrorState message={error} />;
  }

  const sensors = data?.sensors ?? [];
  const readings = data?.readings ?? [];
  const alerts = data?.alerts ?? [];
  const zones = data?.zones ?? [];

  /*
   * Old alerts may not have `status` yet.
   * Treat missing status as ACTIVE for backward compatibility.
   */
  const activeAlerts = alerts.filter(
    (alert) => !alert.status || alert.status === "ACTIVE",
  );

  const resolvedAlerts = alerts.filter((alert) => alert.status === "RESOLVED");

  const activeSensors = sensors.filter(
    (sensor) => sensor.status === "ACTIVE",
  ).length;

  const validReadings = readings.filter(
    (reading) => reading.validationStatus === "VALID",
  ).length;

  const pendingAlerts = activeAlerts.filter(
    (alert) => alert.deliveryStatus === "PENDING",
  ).length;

  /*
   * Only ACTIVE alerts are shown as current risk markers.
   * RESOLVED alerts remain in history but disappear from the live map.
   */
  const mapLocations = activeAlerts
    .filter((alert) => alert.location)
    .slice(0, 20)
    .map((alert) => ({
      id: alert._id,
      location: alert.location,
      title: alert.sensorId,
      description: alert.message,
      risk: true,
    }));

  const columns = [
    {
      key: "sensorId",
      label: "Sensor ID",
    },
    {
      key: "sensorType",
      label: "Type",
    },
    {
      key: "validationStatus",
      label: "Validation",
      render: (row) => <StatusBadge status={row.validationStatus} />,
    },
    {
      key: "processingStatus",
      label: "Processing",
      render: (row) => <StatusBadge status={row.processingStatus} />,
    },
    {
      key: "timestamp",
      label: "Reading Time",
      render: (row) => formatDate(row.timestamp),
    },
  ];

  return (
    <div className="wg-page">
      <PageHeading
        title="Monitoring Overview"
        description="Live view of registered sensors, incoming readings, detected risks and alert activity."
        actions={
          <button
            type="button"
            className="wg-btn wg-btn-primary"
            onClick={() => navigate("/monitoring/simulate")}
          >
            + Simulate Reading
          </button>
        }
      />

      {error && (
        <div className="wg-warning">Dashboard refresh failed: {error}</div>
      )}

      <div className="wg-stats-grid">
        <StatCard
          label="Active Sensors"
          value={formatNumber(activeSensors)}
          icon="⌁"
        />

        <StatCard
          label="Total Readings"
          value={formatNumber(data?.counts?.readings ?? readings.length)}
          icon="▤"
          tone="blue"
        />

        <StatCard
          label="Valid Readings"
          value={formatNumber(validReadings)}
          icon="✓"
          tone="green"
        />

        <StatCard
          label="Current Risks"
          value={formatNumber(activeAlerts.length)}
          icon="⚠"
          tone="red"
        />
      </div>

      <div className="wg-dashboard-grid">
        <Panel
          title="Risk Zone & Current Risk Map"
          action={<span className="wg-live-label">● Live Monitoring</span>}
        >
          <MonitoringMap
            locations={mapLocations}
            zones={zones}
            height={430}
            zoom={11}
          />

          {activeAlerts.length > 0 ? (
            <div className="wg-risk-summary">
              <div>
                <strong>
                  ⚠ {activeAlerts.length} Current Risk
                  {activeAlerts.length === 1 ? "" : "s"}
                </strong>

                <p>
                  Risk-zone circles remain visible as configured areas. Only
                  active sensor risks are shown as red markers.
                </p>
              </div>

              <button
                type="button"
                className="wg-btn wg-btn-outline"
                onClick={() => navigate("/monitoring/alerts")}
              >
                View Alerts
              </button>
            </div>
          ) : (
            <div className="wg-safe-summary">
              ✓ No active sensor risks at the moment.
            </div>
          )}
        </Panel>

        <Panel
          title="Current Risk Alerts"
          action={
            <button
              type="button"
              className="wg-link-button"
              onClick={() => navigate("/monitoring/alerts")}
            >
              View History →
            </button>
          }
        >
          {activeAlerts.length === 0 ? (
            <EmptyState
              title="No active risks"
              description="All detected risks are currently resolved."
            />
          ) : (
            <div className="wg-alert-list">
              {activeAlerts.slice(0, 5).map((alert) => (
                <div className="wg-alert-item" key={alert._id}>
                  <span className="wg-alert-symbol">!</span>

                  <span className="wg-alert-content">
                    <strong>{alert.message}</strong>

                    <small>
                      {alert.sensorId} · {formatDate(alert.createdAt)}
                    </small>
                  </span>

                  <StatusBadge status={alert.severity} />
                </div>
              ))}
            </div>
          )}

          {resolvedAlerts.length > 0 && (
            <p className="wg-table-summary">
              {resolvedAlerts.length} resolved alert
              {resolvedAlerts.length === 1 ? "" : "s"} kept in history.
            </p>
          )}
        </Panel>
      </div>

      <Panel title="Recent Monitoring Data">
        <DataTable
          columns={columns}
          rows={readings.slice(0, 10)}
          emptyMessage="No monitoring readings available."
        />
      </Panel>
    </div>
  );
}
