import { RANGER_STATUS_FILTERS } from '../utils/ranger-management.js';

export default function RangerStatusTabs({ status, onChange }) {
  return (
    <div
      className="ranger-status-tabs"
      role="group"
      aria-label="Filter Rangers by status"
    >
      {RANGER_STATUS_FILTERS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          className={status === value ? 'is-active' : ''}
          aria-pressed={status === value}
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
