import { useState } from "react";

import { monitoringApi } from "../services/monitoringApi.js";

import { useMonitoringResource } from "../hooks/useMonitoringResource.js";

import {
  PageHeading,
  Panel,
  DataTable,
  StatusBadge,
  LoadingState,
  ErrorState,
} from "../components/MonitoringUI.jsx";

import { formatDate, formatLabel } from "../utils/monitoringFormat.js";

const loadAlerts = () => monitoringApi.getAlerts();

const ITEMS_PER_PAGE = 10;

export default function AlertsPage({
  navigate,
  detailsBasePath = "/monitoring/alerts",
  hidePageHeading = false,
}) {
  const [severity, setSeverity] = useState("ALL");
  const [delivery, setDelivery] = useState("ALL");
  const [riskStatus, setRiskStatus] = useState("ALL");
  const [page, setPage] = useState(1);

  const { data, loading, error, refresh } = useMonitoringResource(loadAlerts);

  const alerts = Array.isArray(data) ? data : [];

  const filtered = alerts.filter((alert) => {
    const matchesSeverity = severity === "ALL" || alert.severity === severity;

    const matchesDelivery =
      delivery === "ALL" || alert.deliveryStatus === delivery;

    const currentStatus = alert.status || "ACTIVE";

    const matchesRiskStatus =
      riskStatus === "ALL" || currentStatus === riskStatus;

    return matchesSeverity && matchesDelivery && matchesRiskStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  const currentPage = Math.min(page, totalPages);

  const paginatedAlerts = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const startItem =
    filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;

  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, filtered.length);

  if (loading && !data) {
    return <LoadingState />;
  }

  if (error && !data) {
    return <ErrorState message={error} onRetry={refresh} />;
  }

  const columns = [
    {
      key: "sensorId",
      label: "Sensor ID",
    },

    {
      key: "type",
      label: "Risk Type",
      render: (row) => formatLabel(row.type),
    },

    {
      key: "severity",
      label: "Severity",
      render: (row) => <StatusBadge status={row.severity} />,
    },

    {
      key: "status",
      label: "Risk Status",
      render: (row) => <StatusBadge status={row.status || "ACTIVE"} />,
    },

    {
      key: "deliveryStatus",
      label: "Delivery",
      render: (row) => <StatusBadge status={row.deliveryStatus} />,
    },

    {
      key: "recipient",
      label: "Recipient",
      render: (row) => formatLabel(row.recipient),
    },

    {
      key: "createdAt",
      label: "Generated",
      render: (row) => formatDate(row.createdAt),
    },

    {
      key: "resolvedAt",
      label: "Resolved At",
      render: (row) =>
        row.status === "RESOLVED" ? formatDate(row.resolvedAt) : "—",
    },

    {
      key: "actions",
      label: "Action",
      render: (row) => (
        <button
          type="button"
          className="wg-link-button"
          onClick={() => navigate?.(`${detailsBasePath}/${row._id}`)}
        >
          View Details →
        </button>
      ),
    },
  ];

  return (
    <div className="wg-page">
      {!hidePageHeading && (
        <PageHeading
          title="Risk Alerts"
          description="Generated wildlife monitoring alerts and their delivery status."
        />
      )}

      <Panel>
        <div className="wg-filters">
          <select
            value={riskStatus}
            onChange={(event) => {
              setRiskStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">All Risk Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          <select
            value={severity}
            onChange={(event) => {
              setSeverity(event.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">All Severities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>

          <select
            value={delivery}
            onChange={(event) => {
              setDelivery(event.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">All Deliveries</option>
            <option value="PENDING">Pending</option>
            <option value="DELIVERED">Delivered</option>
          </select>

          <button
            type="button"
            className="wg-btn wg-btn-outline"
            onClick={() => {
              setPage(1);
              refresh();
            }}
          >
            Refresh
          </button>
        </div>

        <div className="wg-table-summary">
          {filtered.length === 0
            ? `Showing 0 of ${alerts.length} alerts`
            : `Showing ${startItem}-${endItem} of ${filtered.length} alerts`}
        </div>

        <DataTable
          rows={paginatedAlerts}
          columns={columns}
          emptyMessage="No risk alerts found."
        />

        {totalPages > 1 && (
          <div className="wg-pagination">
            <button
              type="button"
              className="wg-btn wg-btn-outline"
              disabled={currentPage === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </button>

            <div className="wg-pagination-pages">
              {Array.from({ length: totalPages }, (_, index) => {
                const pageNumber = index + 1;

                return (
                  <button
                    key={pageNumber}
                    type="button"
                    className={`wg-page-button ${
                      currentPage === pageNumber ? "is-active" : ""
                    }`}
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="wg-btn wg-btn-outline"
              disabled={currentPage === totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
            >
              Next
            </button>
          </div>
        )}
      </Panel>
    </div>
  );
}
