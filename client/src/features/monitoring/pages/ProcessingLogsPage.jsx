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

const loadLogs = () => monitoringApi.getLogs();

const ITEMS_PER_PAGE = 10;

export default function ProcessingLogsPage() {
  const [level, setLevel] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, loading, error, refresh } = useMonitoringResource(loadLogs);

  const logs = Array.isArray(data) ? data : [];

  const filtered = logs.filter((log) => {
    const matchesLevel = level === "ALL" || log.level === level;

    const query = search.trim().toLowerCase();

    const matchesSearch =
      String(log.sensorId ?? "")
        .toLowerCase()
        .includes(query) ||
      String(log.event ?? "")
        .toLowerCase()
        .includes(query) ||
      String(log.message ?? "")
        .toLowerCase()
        .includes(query);

    return matchesLevel && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  const currentPage = Math.min(page, totalPages);

  const paginatedLogs = filtered.slice(
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
      key: "createdAt",
      label: "Time",
      render: (row) => formatDate(row.createdAt),
    },

    {
      key: "sensorId",
      label: "Sensor",
      render: (row) => row.sensorId ?? "N/A",
    },

    {
      key: "event",
      label: "Event",
      render: (row) => formatLabel(row.event),
    },

    {
      key: "level",
      label: "Level",
      render: (row) => <StatusBadge status={row.level} />,
    },

    {
      key: "message",
      label: "Description",
    },
  ];

  return (
    <div className="wg-page">
      <PageHeading
        title="Processing Logs"
        description="Validation, risk-analysis, alert-delivery and sensor-processing events."
      />

      <Panel>
        <div className="wg-filters">
          <input
            type="search"
            placeholder="Search sensor, event or message..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />

          <select
            value={level}
            onChange={(event) => {
              setLevel(event.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">All Levels</option>
            <option value="INFO">Information</option>
            <option value="WARNING">Warning</option>
            <option value="ERROR">Error</option>
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
            ? `Showing 0 of ${logs.length} logs`
            : `Showing ${startItem}-${endItem} of ${filtered.length} logs`}
        </div>

        <DataTable
          rows={paginatedLogs}
          columns={columns}
          emptyMessage="No processing logs found."
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
