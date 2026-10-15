import { FIELD_INCIDENT_RISK_LEVELS } from '../../field-incidents/config/field-incident.constants.js';
import { fieldIncidentTypes } from '../../field-incidents/utils/field-incident-options.js';

export default function IncidentManagementFilters({ query, parks, onChange, onClear, validationError }) {
  function change(event) {
    onChange({ type: 'filter', name: event.target.name, value: event.target.value });
  }

  return (
    <section className="cr-panel im-filters" aria-label="Filter incident reports">
      <div className="im-section-heading">
        <h2>Search &amp; filters</h2>
        <button type="button" className="cr-secondary-button im-small-button" onClick={onClear}>Clear Filters</button>
      </div>
      <div className="cr-filter-grid im-filter-grid">
        <label className="cr-field im-search">
          <span>Search reports</span>
          <input type="search" name="search" placeholder="Incident ID, ranger name or incident type"
            value={query.search} onChange={change} maxLength={100} />
        </label>
        <label className="cr-field">
          <span>Incident type</span>
          <select name="incidentType" value={query.incidentType} onChange={change}>
            <option value="">All incident types</option>
            {fieldIncidentTypes.map(({ value, title }) => <option key={value} value={value}>{title}</option>)}
          </select>
        </label>
        <label className="cr-field">
          <span>Risk level</span>
          <select name="riskLevel" value={query.riskLevel} onChange={change}>
            <option value="">All risk levels</option>
            {FIELD_INCIDENT_RISK_LEVELS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="cr-field">
          <span>Park / Zone</span>
          <select name="parkZone" value={query.parkZone} onChange={change}>
            <option value="">All authorized parks / zones</option>
            {parks.map((park) => <option key={park} value={park}>{park}</option>)}
            {query.parkZone && !parks.includes(query.parkZone) && <option value={query.parkZone}>{query.parkZone}</option>}
          </select>
        </label>
        <label className="cr-field">
          <span>Incident date from</span>
          <input type="date" name="startDate" value={query.startDate} onChange={change}
            aria-invalid={Boolean(validationError)} aria-describedby={validationError ? 'incident-date-error' : undefined} />
        </label>
        <label className="cr-field">
          <span>Incident date to</span>
          <input type="date" name="endDate" value={query.endDate} onChange={change}
            aria-invalid={Boolean(validationError)} aria-describedby={validationError ? 'incident-date-error' : undefined} />
        </label>
        <label className="cr-field">
          <span>Report status</span>
          <select name="status" value={query.status} onChange={change}>
            <option value="">All report statuses</option>
            <option value="SUBMITTED">Submitted</option>
          </select>
        </label>
        <label className="cr-field">
          <span>Sort by incident date</span>
          <select name="sort" value={query.sort} onChange={(event) => onChange({ type: 'sort', value: event.target.value })}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>
      {validationError && <p className="cr-field-error" id="incident-date-error" role="alert">{validationError}</p>}
    </section>
  );
}
