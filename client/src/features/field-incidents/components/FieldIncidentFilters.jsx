import { fieldIncidentTypes } from '../utils/field-incident-options.js';
import { FIELD_INCIDENT_PENDING_SYNC, FIELD_INCIDENT_RISK_LEVELS, FIELD_INCIDENT_SUBMITTED } from '../config/field-incident.constants.js';

export default function FieldIncidentFilters({ filters, onChange, disabled = false }) {
  function changeFilter(key, value) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="field-incidents-filters" role="group" aria-label="Filter incidents">
      <label className="field-incidents-search" htmlFor="my-incidents-search">
        <span>Search</span>
        <input id="my-incidents-search" type="search" placeholder="Search incidents..."
          value={filters.search} disabled={disabled}
          onChange={(event) => changeFilter('search', event.target.value)} />
      </label>
      <label className="field-incidents-filter" htmlFor="my-incidents-status">
        <span>Status</span>
        <select id="my-incidents-status" value={filters.status} disabled={disabled}
          onChange={(event) => changeFilter('status', event.target.value)}>
          <option value="ALL">All</option>
          <option value={FIELD_INCIDENT_SUBMITTED}>Submitted</option>
          <option value={FIELD_INCIDENT_PENDING_SYNC}>Pending Sync</option>
        </select>
      </label>
      <label className="field-incidents-filter" htmlFor="my-incidents-type">
        <span>Incident Type</span>
        <select id="my-incidents-type" value={filters.incidentType} disabled={disabled}
          onChange={(event) => changeFilter('incidentType', event.target.value)}>
          <option value="ALL">All</option>
          {fieldIncidentTypes.map(({ value, title }) => (
            <option value={value} key={value}>{title}</option>
          ))}
        </select>
      </label>
      <label className="field-incidents-filter" htmlFor="my-incidents-risk">
        <span>Risk Level</span>
        <select id="my-incidents-risk" value={filters.riskLevel} disabled={disabled}
          onChange={(event) => changeFilter('riskLevel', event.target.value)}>
          <option value="ALL">All</option>
          {FIELD_INCIDENT_RISK_LEVELS.map(({ value, label }) => (
            <option value={value} key={value}>{label}</option>
          ))}
        </select>
      </label>
      <label className="field-incidents-filter" htmlFor="my-incidents-sort">
        <span>Sort</span>
        <select id="my-incidents-sort" value={filters.sort} disabled={disabled}
          onChange={(event) => changeFilter('sort', event.target.value)}>
          <option value="NEWEST">Newest first</option>
          <option value="OLDEST">Oldest first</option>
        </select>
      </label>
    </div>
  );
}
