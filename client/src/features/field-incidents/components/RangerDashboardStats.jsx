import { CloudUpload } from 'lucide-react';
import CommunityIcon from '../../community-reports/components/CommunityIcon.jsx';

export default function RangerDashboardStats({
  counts, isLoading, serverUnavailable, pendingUnavailable, onViewIncidents,
}) {
  const cards = [
    { key: 'total', label: 'Total My Incidents', icon: 'document',
      hint: 'Submitted + pending sync', unavailable: serverUnavailable || pendingUnavailable },
    { key: 'submittedToday', label: 'Submitted Today', icon: 'clock',
      hint: 'Based on submission date', unavailable: serverUnavailable },
    { key: 'pendingSync', label: 'Pending Sync',
      hint: 'Will sync when online', unavailable: pendingUnavailable },
  ];

  return (
    <section className="ranger-dashboard-stats" aria-label="Your incident summary" aria-busy={isLoading}>
      {isLoading && <span className="ranger-dashboard-sr-only" role="status">Loading incident counts…</span>}
      {cards.map(({ key, label, icon, hint, unavailable }) => (
        <button type="button" className="ranger-dashboard-stat" key={key} onClick={onViewIncidents}
          aria-label={`${label}: ${isLoading ? 'loading' : unavailable ? 'unavailable' : counts[key]}. View My Incidents`}>
          <span className="ranger-dashboard-stat-icon">
            {icon ? <CommunityIcon name={icon} size={29} /> : <CloudUpload size={30} aria-hidden="true" />}
          </span>
          <span className="ranger-dashboard-stat-content">
            <span className="ranger-dashboard-stat-label">{label}</span>
            <span className="ranger-dashboard-stat-value">
              <strong>{isLoading || unavailable ? '—' : counts[key]}</strong>
              <small>{unavailable && !isLoading ? 'Temporarily unavailable' : hint}</small>
            </span>
          </span>
          <span className="ranger-dashboard-stat-arrow"><CommunityIcon name="chevron" size={17} /></span>
        </button>
      ))}
    </section>
  );
}
