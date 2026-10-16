import { useAuth } from '../../../context/useAuth.js';
import QuickIncidentAccess from '../components/QuickIncidentAccess.jsx';
import RangerDashboardHero from '../components/RangerDashboardHero.jsx';
import RangerDashboardStats from '../components/RangerDashboardStats.jsx';
import RangerLayout from '../components/RangerLayout.jsx';
import { useFieldIncidentDraft } from '../context/useFieldIncidentDraft.js';
import useFieldIncidentHistory from '../hooks/useFieldIncidentHistory.js';
import { summarizeRangerDashboard } from '../utils/ranger-dashboard-stats.js';
import './ranger-dashboard.css';

export default function RangerDashboardPage({ navigate }) {
  const { user } = useAuth();
  const { resetDraft, updateDraft } = useFieldIncidentDraft();
  const { incidents, isLoading, serverError, offlineWarning, retry } = useFieldIncidentHistory(user.id);
  const counts = summarizeRangerDashboard(incidents);

  function startQuickIncident(incidentType) {
    resetDraft();
    updateDraft({ incidentType });
    navigate('/ranger/incidents/details');
  }

  return (
    <RangerLayout navigate={navigate} active="dashboard">
      <div className="ranger-dashboard">
        <RangerDashboardHero fullName={user.fullName} onReport={() => navigate('/ranger/incidents/new')} />
        <RangerDashboardStats counts={counts} isLoading={isLoading}
          serverUnavailable={Boolean(serverError)} pendingUnavailable={Boolean(offlineWarning)}
          onViewIncidents={() => navigate('/ranger/incidents')} />

        {(serverError || offlineWarning) && (
          <div className="ranger-dashboard-notice" role="alert">
            <div>
              <strong>Some incident counts are unavailable.</strong>
              {serverError && <p>{serverError}</p>}
              {offlineWarning && <p>{offlineWarning}</p>}
            </div>
            <button type="button" className="secondary-button" onClick={retry} disabled={isLoading}>Retry</button>
          </div>
        )}

        <QuickIncidentAccess onSelectType={startQuickIncident}
          onViewAll={() => navigate('/ranger/incidents/new')} />
      </div>
    </RangerLayout>
  );
}
