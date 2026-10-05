export default function ReportTypeCard({ type, selected, onSelect }) {
  return <button type="button" className={`report-type-card${selected ? ' is-selected' : ''}`} onClick={() => onSelect(type.value)} aria-pressed={selected}>
    <strong>{type.title}</strong><span>{type.description}</span>
  </button>;
}
