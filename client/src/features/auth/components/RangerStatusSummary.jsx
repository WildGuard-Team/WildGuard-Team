const SUMMARY_CARDS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'total', label: 'Total Rangers' },
];

export default function RangerStatusSummary({ counts, isLoading }) {
  return (
    <section
      className="cr-metric-grid ranger-status-summary"
      aria-label="Ranger approval summary"
      aria-busy={isLoading}
    >
      {SUMMARY_CARDS.map(({ key, label }) => (
        <article key={key} data-status={key.toLowerCase()}>
          <span>{label}</span>
          <strong>{isLoading ? '—' : counts[key]}</strong>
        </article>
      ))}
    </section>
  );
}
