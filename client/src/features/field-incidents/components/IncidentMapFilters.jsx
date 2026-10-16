import { FIELD_INCIDENT_PENDING_SYNC, FIELD_INCIDENT_RISK_LEVELS, FIELD_INCIDENT_SUBMITTED } from '../config/field-incident.constants.js';
import { fieldIncidentTypes } from '../utils/field-incident-options.js';

export default function IncidentMapFilters({ filters, onChange, onClear, hasActiveFilters, disabled }) {
  function change(key, value) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="ranger-map-filters" role="group" aria-label="Filter incident locations">
      <label className="ranger-map-search">
        <span>Search</span>
        <input type="search" placeholder="Reference, park, block / area…" value={filters.search}
          disabled={disabled} onChange={(event) => change('search', event.target.value)} />
      </label>
      <label>
        <span>Incident Type</span>
        <select value={filters.incidentType} disabled={disabled}
          onChange={(event) => change('incidentType', event.target.value)}>
          <option value="ALL">All types</option>
          {fieldIncidentTypes.map(({ value, title }) => <option value={value} key={value}>{title}</option>)}
        </select>
      </label>
      <label>
        <span>Risk Level</span>
        <select value={filters.riskLevel} disabled={disabled}
          onChange={(event) => change('riskLevel', event.target.value)}>
          <option value="ALL">All risk levels</option>
          {FIELD_INCIDENT_RISK_LEVELS.map(({ value, label }) => <option value={value} key={value}>{label}</option>)}
        </select>
      </label>
      <label>
        <span>Status</span>
        <select value={filters.status} disabled={disabled}
          onChange={(event) => change('status', event.target.value)}>
          <option value="ALL">All statuses</option>
          <option value={FIELD_INCIDENT_SUBMITTED}>Submitted</option>
          <option value={FIELD_INCIDENT_PENDING_SYNC}>Pending Sync</option>
        </select>
      </label>
      <button type="button" className="ranger-map-clear" disabled={disabled || !hasActiveFilters} onClick={onClear}>Clear filters</button>
    </div>
  );
}
