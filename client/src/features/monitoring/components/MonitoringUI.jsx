import { formatLabel, getStatusTone } from "../utils/monitoringFormat.js";

export function PageHeading({ title, description, actions }) {
  return (
    <div className="wg-page-heading">
      <div>
        <h2>{title}</h2>

        {description && <p>{description}</p>}
      </div>

      {actions && <div className="wg-page-actions">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className = "" }) {
  return (
    <section className={`wg-panel ${className}`}>
      {(title || action) && (
        <div className="wg-panel-header">
          <h3>{title}</h3>

          {action}
        </div>
      )}

      {children}
    </section>
  );
}

export function StatusBadge({ status }) {
  return (
    <span className={`wg-badge wg-badge-${getStatusTone(status)}`}>
      {formatLabel(status)}
    </span>
  );
}

export function EmptyState({ title = "No data available", description }) {
  return (
    <div className="wg-empty-state">
      <div className="wg-empty-icon">◇</div>

      <h3>{title}</h3>

      {description && <p>{description}</p>}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="wg-loading" role="status" aria-live="polite">
      <span className="wg-spinner" />
      Loading monitoring data...
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="wg-error" role="alert">
      <div>
        <strong>Unable to load data</strong>
        <p>{message}</p>
      </div>

      {onRetry && (
        <button
          type="button"
          className="wg-btn wg-btn-outline"
          onClick={onRetry}
        >
          Try Again
        </button>
      )}
    </div>
  );
}

export function StatCard({ label, value, icon, tone = "green" }) {
  return (
    <article className="wg-stat-card">
      <div className="wg-stat-top">
        <span className={`wg-stat-icon wg-tone-${tone}`}>{icon}</span>
      </div>

      <p>{label}</p>
      <h3>{value}</h3>
    </article>
  );
}

export function DetailRow({ label, value }) {
  return (
    <div className="wg-detail-row">
      <span>{label}</span>
      <strong>{value ?? "N/A"}</strong>
    </div>
  );
}

export function DataTable({
  columns,
  rows,
  emptyMessage = "No records found.",
}) {
  if (!rows.length) {
    return <EmptyState title={emptyMessage} />;
  }

  return (
    <div className="wg-table-scroll">
      <table className="wg-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={row._id}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render
                    ? column.render(row)
                    : (row[column.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
