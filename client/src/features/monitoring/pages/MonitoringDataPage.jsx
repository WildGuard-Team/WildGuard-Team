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

const loadReadings = () => monitoringApi.getReadings();

const ITEMS_PER_PAGE = 10;

export default function MonitoringDataPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [page, setPage] = useState(1);

  const { data, loading, error, refresh } = useMonitoringResource(loadReadings);

  const readings = Array.isArray(data) ? data : [];

  const filtered = readings.filter((reading) => {
    const matchesSearch = String(reading.sensorId ?? "")
      .toLowerCase()
      .includes(search.trim().toLowerCase());

    const matchesStatus =
      status === "ALL" || reading.validationStatus === status;

    const matchesType = type === "ALL" || reading.sensorType === type;

    return matchesSearch && matchesStatus && matchesType;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  const currentPage = Math.min(page, totalPages);

  const paginatedReadings = filtered.slice(
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
      key: "sensorType",
      label: "Sensor Type",
      render: (row) => formatLabel(row.sensorType),
    },

    {
      key: "timestamp",
      label: "Reading Time",
      render: (row) => formatDate(row.timestamp),
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
      key: "location",
      label: "Location",
      render: (row) =>
        row.location
          ? `${row.location.latitude}, ${row.location.longitude}`
          : "N/A",
    },
  ];

  return (
    <div className="wg-page">
      <PageHeading
        title="Monitoring Data"
        description="Incoming GPS collar, camera-trap readings."
      />

      <Panel>
        <div className="wg-filters">
          <input
            type="search"
            placeholder="Search Sensor ID..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="VALID">Valid</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">All Types</option>
            <option value="GPS_COLLAR">GPS Collar</option>
            <option value="CAMERA_TRAP">Camera Trap</option>
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
            ? `Showing 0 of ${readings.length} readings`
            : `Showing ${startItem}-${endItem} of ${filtered.length} readings`}
        </div>

        <DataTable
          rows={paginatedReadings}
          columns={columns}
          emptyMessage="No matching monitoring readings."
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
