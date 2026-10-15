export default function IncidentManagementPagination({ pagination, query, onChange, disabled }) {
  const page = pagination?.page ?? query.page;
  const total = pagination?.total ?? 0;
  const totalPages = pagination?.totalPages ?? 0;
  const first = (page - 1) * query.pageSize + 1;
  const start = total && first <= total ? first : 0;
  const end = start ? Math.min(page * query.pageSize, total) : 0;

  return (
    <div className="im-pagination">
      <label className="im-page-size">
        <span>Reports per page</span>
        <select value={query.pageSize} disabled={disabled}
          onChange={(event) => onChange({ type: 'pageSize', value: Number(event.target.value) })}>
          {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
      </label>
      <span className="im-page-range" aria-live="polite">{pagination ? `${start}–${end} of ${total} reports` : '—'}</span>
      <nav aria-label="Incident report pagination">
        <button type="button" className="cr-secondary-button im-small-button"
          disabled={disabled || !pagination || page <= 1}
          onClick={() => onChange({ type: 'page', value: page - 1 })}>Previous</button>
        <span>Page {page} of {Math.max(1, totalPages)}</span>
        <button type="button" className="cr-secondary-button im-small-button"
          disabled={disabled || !pagination || page >= totalPages}
          onClick={() => onChange({ type: 'page', value: page + 1 })}>Next</button>
      </nav>
    </div>
  );
}
