import CommunityIcon from '../../community-reports/components/CommunityIcon.jsx';

export default function IncidentMapSummary({ counts, isLoading, serverUnavailable, pendingUnavailable }) {
  const cards = [
    { key: 'mapped', label: 'Mapped Incidents', icon: 'pin', hint: 'With valid GPS coordinates', unavailable: serverUnavailable || pendingUnavailable },
    { key: 'highRisk', label: 'High Risk', icon: 'report', hint: 'Mapped high-risk incidents', unavailable: serverUnavailable || pendingUnavailable },
    { key: 'pendingSync', label: 'Pending Sync', icon: 'refresh', hint: 'Mapped offline incidents', unavailable: pendingUnavailable },
  ];
  return (
    <section className="ranger-map-summary" aria-label="Map summary" aria-busy={isLoading}>
      {cards.map(({ key, label, icon, hint, unavailable }) => (
        <article className={`ranger-map-summary-card is-${key}`} key={key}>
          <span className="ranger-map-summary-icon"><CommunityIcon name={icon} size={25} /></span>
          <div>
            <h2>{label}</h2>
            <div className="ranger-map-summary-value">
              <strong aria-label={`${label}: ${isLoading ? 'loading' : unavailable ? 'unavailable' : counts[key]}`}>
                {isLoading || unavailable ? '—' : counts[key]}
              </strong>
              <span>{unavailable && !isLoading ? 'Temporarily unavailable' : hint}</span>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
