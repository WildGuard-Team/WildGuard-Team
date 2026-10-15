import {
  CONFLICT_TYPES, formatOption, INCIDENT_TYPES, PARKS, PATROL_ROUTES, PATROL_STATUSES, SEVERITIES,
} from '../config/report-options.js';
import ManagerIcon from './ManagerIcon.jsx';

export default function ReportFilterForm({ form, errors, onChange, onSubmit, isGenerating }) {
  const routes = form.park ? PATROL_ROUTES.filter((route) => route.park === form.park) : PATROL_ROUTES;
  return <form className="cr-panel cr-filter-panel" noValidate onSubmit={onSubmit}>
    <div className="cr-section-heading"><span>2</span><div><h2>Set report parameters</h2><p>Charts and totals will be calculated from records matching these filters.</p></div></div>
    <div className="cr-filter-grid">
      <Field label="Start date" error={errors.startDate}><input type="date" name="startDate" value={form.startDate} onChange={onChange} aria-invalid={Boolean(errors.startDate)} /></Field>
      <Field label="End date" error={errors.endDate}><input type="date" name="endDate" value={form.endDate} onChange={onChange} aria-invalid={Boolean(errors.endDate)} /></Field>
      <Field label="Park"><Select name="park" value={form.park} onChange={onChange} placeholder="All parks" options={PARKS} /></Field>
      {form.reportType !== 'PATROL_COVERAGE_REPORT' && <Field label="Location contains"><input name="location" value={form.location} onChange={onChange} placeholder="All locations" maxLength="160" /></Field>}
      {form.reportType === 'INCIDENT_REPORT' && <>
        <Field label="Incident type"><Select name="incidentType" value={form.incidentType} onChange={onChange} placeholder="All incident types" options={INCIDENT_TYPES} /></Field>
        <Field label="Severity"><Select name="severity" value={form.severity} onChange={onChange} placeholder="All severities" options={SEVERITIES} /></Field>
      </>}
      {form.reportType === 'PATROL_COVERAGE_REPORT' && <>
        <Field label="Patrol route"><select name="routeSourceId" value={form.routeSourceId} onChange={onChange}><option value="">All routes</option>{routes.map((route) => <option key={route.value} value={route.value}>{route.label}</option>)}</select></Field>
        <Field label="Patrol status"><Select name="status" value={form.status} onChange={onChange} placeholder="All statuses" options={PATROL_STATUSES} /></Field>
      </>}
      {form.reportType === 'CONFLICT_TREND_REPORT' && <>
        <Field label="Conflict type"><Select name="conflictType" value={form.conflictType} onChange={onChange} placeholder="All conflict types" options={CONFLICT_TYPES} /></Field>
        <Field label="Severity"><Select name="severity" value={form.severity} onChange={onChange} placeholder="All severities" options={SEVERITIES} /></Field>
      </>}
    </div>
    <div className="cr-filter-note"><ManagerIcon name="filter" size={18} /><span>Leave optional filters blank to include every matching record in the selected period.</span></div>
    <div className="cr-form-actions"><button type="submit" className="cr-primary-button" disabled={isGenerating}><span>{isGenerating ? 'Calculating report…' : 'Generate report'}</span>{isGenerating ? <i className="cr-button-spinner" /> : <ManagerIcon name="chevron" size={18} />}</button></div>
  </form>;
}

function Field({ label, error, children }) {
  return <label className="cr-field"><span>{label}</span>{children}{error && <small role="alert">{error}</small>}</label>;
}

function Select({ name, value, onChange, placeholder, options }) {
  return <select name={name} value={value} onChange={onChange}><option value="">{placeholder}</option>{options.map((option) => <option key={option} value={option}>{formatOption(option)}</option>)}</select>;
}
