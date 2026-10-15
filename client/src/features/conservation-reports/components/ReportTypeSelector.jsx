import { REPORT_TYPES } from '../config/report-options.js';
import ManagerIcon from './ManagerIcon.jsx';

export default function ReportTypeSelector({ value, onChange, error }) {
  return <section className="cr-panel" aria-labelledby="report-type-heading">
    <div className="cr-section-heading"><span>1</span><div><h2 id="report-type-heading">Choose report type</h2><p>Select the conservation analysis you want to generate.</p></div></div>
    <div className="cr-type-grid">{REPORT_TYPES.map((type) => <button key={type.value} type="button" className={`cr-type-card${value === type.value ? ' is-selected' : ''}`} onClick={() => onChange(type.value)} aria-pressed={value === type.value}>
      <span className="cr-type-icon"><ManagerIcon name={type.icon} size={27} /></span>
      <span><strong>{type.title}</strong><small>{type.description}</small></span>
      <i>{value === type.value ? <ManagerIcon name="check" size={17} /> : null}</i>
    </button>)}</div>
    {error && <p className="cr-field-error" role="alert">{error}</p>}
  </section>;
}
