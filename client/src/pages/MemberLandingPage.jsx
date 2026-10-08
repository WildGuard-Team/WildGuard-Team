import { useAuth } from '../context/useAuth.js';
import CommunityLayout from '../features/community-reports/components/CommunityLayout.jsx';
import CommunityIcon from '../features/community-reports/components/CommunityIcon.jsx';
import { useReportDraft } from '../features/community-reports/context/useReportDraft.js';
import { useDashboardReports } from '../features/community-reports/hooks/useDashboardReports.js';
import { reportTypeLabel } from '../features/community-reports/utils/report-options.js';
import './community-dashboard.css';

const reportStatusLabels = {
  under_review: 'UNDER REVIEW',
  approved: 'APPROVED',
  rejected: 'REJECTED',
};

function reportStatus(report) {
  return report?.status === 'approved' || report?.status === 'rejected' ? report.status : 'under_review';
}

function firstName(fullName) {
  return String(fullName ?? '').trim().split(/\s+/)[0] || 'there';
}

function reportLocation(report) {
  const location = report?.location;
  if (location?.displayName) return location.displayName;
  if (location?.manualLocation) return location.manualLocation;
  if (Number.isFinite(location?.coordinates?.latitude) && Number.isFinite(location?.coordinates?.longitude)) {
    return `${location.coordinates.latitude.toFixed(5)}, ${location.coordinates.longitude.toFixed(5)}`;
  }
  return 'Location not available';
}

function submittedTime(value) {
  const timestamp = Date.parse(value ?? '');
  if (!Number.isFinite(timestamp)) return 'Submitted date unavailable';
  const elapsed = Date.now() - timestamp;
  if (elapsed < 0) return `Submitted ${formatDate(timestamp)}`;
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return 'Submitted just now';
  if (minutes < 60) return `Submitted ${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Submitted ${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Submitted ${days} day${days === 1 ? '' : 's'} ago`;
  return `Submitted ${formatDate(timestamp)}`;
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat('en-LK', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(timestamp));
}

function iconForReportType(reportType) {
  if (reportType === 'WILDLIFE_SIGHTING') return 'paw';
  if (reportType === 'HUMAN_WILDLIFE_CONFLICT') return 'users';
  return 'report';
}

export default function MemberLandingPage({ navigate }) {
  const { user } = useAuth();
  const { resetDraft } = useReportDraft();
  const { reports, loading, error, retry } = useDashboardReports(user?.id);
  const statusCount = (status) => reports.filter((report) => reportStatus(report) === status).length;
  const recentReports = [...reports]
    .sort((a, b) => Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? ''))
    .slice(0, 2);

  function startReport() {
    resetDraft();
    navigate('/reports/type');
  }

  return (
    <CommunityLayout navigate={navigate} active="dashboard">
      <section className="community-dashboard" aria-labelledby="dashboard-title">
        <header className="dashboard-welcome">
          <p>Community member dashboard</p>
          <h1 id="dashboard-title">Welcome back, {firstName(user?.fullName)}.</h1>
          <span>Help WildGuard protect wildlife by sharing incidents in your community.</span>
          <button type="button" className="primary-button" onClick={startReport}>Submit a Community Report <CommunityIcon name="chevron" size={20} /></button>
        </header>

        <section className="dashboard-summary-grid" aria-label="Report summary" aria-busy={loading}>
          <DashboardSummaryCard icon="document" label="Reports submitted" value={reports.length} loading={loading} unavailable={Boolean(error)} />
          <DashboardSummaryCard icon="clock" label="Under review" value={statusCount('under_review')} loading={loading} unavailable={Boolean(error)} />
          <DashboardSummaryCard icon="check-circle" label="Approved" value={statusCount('approved')} loading={loading} unavailable={Boolean(error)} />
        </section>

        <section className="dashboard-recent-panel" aria-labelledby="recent-reports-title">
          <header className="dashboard-recent-panel__header">
            <h2 id="recent-reports-title">Recent reports</h2>
            <button type="button" className="dashboard-view-all" onClick={() => navigate('/reports/my-reports')}>View all reports <CommunityIcon name="chevron" size={19} /></button>
          </header>
          {loading ? <RecentReportsLoading /> : error ? <DashboardError retry={retry} /> : recentReports.length ? <div className="dashboard-recent-list">{recentReports.map((report) => <RecentReportRow key={report._id} report={report} onClick={() => navigate('/reports/my-reports')} />)}</div> : <DashboardEmptyState onStartReport={startReport} />}
        </section>
      </section>
    </CommunityLayout>
  );
}

function DashboardSummaryCard({ icon, label, value, loading, unavailable }) {
  return <article className="dashboard-summary-card">
    <span className="dashboard-summary-card__icon"><CommunityIcon name={icon} size={38} /></span>
    <div><span className="dashboard-summary-card__label">{label}</span>{loading ? <span className="dashboard-summary-card__value dashboard-skeleton"><span className="sr-only">Loading</span></span> : <strong className="dashboard-summary-card__value" aria-label={unavailable ? 'Unavailable' : undefined}>{unavailable ? '—' : value}</strong>}</div>
  </article>;
}

function RecentReportsLoading() {
  return <div className="dashboard-recent-loading" role="status" aria-label="Loading recent reports">
    {[0, 1].map((index) => <div className="dashboard-recent-loading__row" key={index}>
      <span className="dashboard-skeleton dashboard-recent-loading__icon" />
      <span><span className="dashboard-skeleton dashboard-recent-loading__copy" /><span className="dashboard-skeleton dashboard-recent-loading__meta" /></span>
      <span className="dashboard-skeleton dashboard-recent-loading__pill" />
    </div>)}
  </div>;
}

function DashboardError({ retry }) {
  return <div className="dashboard-inline-error" role="alert"><p>We could not load your submitted reports. Please try again.</p><button type="button" onClick={retry}>Try again</button></div>;
}

function DashboardEmptyState({ onStartReport }) {
  return <div className="dashboard-empty-state"><p>You have not submitted any reports yet.</p><button type="button" className="primary-button" onClick={onStartReport}>Submit a Community Report <CommunityIcon name="chevron" size={18} /></button></div>;
}

function RecentReportRow({ report, onClick }) {
  const status = reportStatus(report);
  return <button type="button" className="dashboard-recent-row" onClick={onClick} aria-label={`View ${reportTypeLabel(report.reportType)} in My Reports`}>
    <span className="dashboard-recent-row__icon"><CommunityIcon name={iconForReportType(report.reportType)} size={32} /></span>
    <span className="dashboard-recent-row__content">
      <strong>{reportTypeLabel(report.reportType)}</strong>
      <span className="dashboard-recent-row__metadata"><span className="dashboard-recent-row__location"><CommunityIcon name="pin" size={18} /><span title={reportLocation(report)}>{reportLocation(report)}</span></span><span className="dashboard-recent-row__divider" aria-hidden="true">•</span><span className="dashboard-recent-row__time">{submittedTime(report.createdAt)}</span></span>
    </span>
    <span className={`dashboard-status-pill dashboard-status-pill--${status}`}>{reportStatusLabels[status]}</span>
    <CommunityIcon name="chevron" size={22} className="dashboard-recent-row__chevron" />
  </button>;
}
