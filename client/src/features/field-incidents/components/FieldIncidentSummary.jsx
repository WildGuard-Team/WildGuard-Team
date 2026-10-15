export default function FieldIncidentSummary({ counts, isLoading = false }) {
  const cards = [
    ['total', 'Total Incidents', ''],
    ['submitted', 'Submitted', 'is-submitted'],
    ['pendingSync', 'Pending Sync', 'is-pending'],
    ['highRisk', 'High Risk', 'is-high-risk'],
  ];

  return (
    <section className="field-incidents-summary" aria-label="Incident summary" aria-busy={isLoading}>
      {cards.map(([key, label, className]) => (
        <article className={`field-incident-summary-card ${className}`} key={key}>
          <span>{label}</span>
          <strong>{isLoading ? '—' : counts[key]}</strong>
        </article>
      ))}
    </section>
  );
}
