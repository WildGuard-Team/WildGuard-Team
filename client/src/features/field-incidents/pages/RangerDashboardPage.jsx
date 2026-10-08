import { useAuth } from '../../../context/useAuth.js';

import CommunityIcon from '../../community-reports/components/CommunityIcon.jsx';
import RangerLayout from '../components/RangerLayout.jsx';

export default function RangerDashboardPage({
  navigate,
}) {
  const { user } = useAuth();

  return (
    <RangerLayout
      navigate={navigate}
      active="dashboard"
    >
      <section className="dashboard-welcome">
        <p>
          Park Ranger Dashboard
        </p>

        <h1>
          Welcome back, {user.fullName}.
        </h1>

        <span>
          Record wildlife incidents and field observations
          from your assigned patrol area.
        </span>

        <button
          type="button"
          className="primary-button"
          onClick={() =>
            navigate('/ranger/incidents/new')
          }
        >
          Report Field Incident

          <CommunityIcon
            name="chevron"
            size={20}
          />
        </button>
      </section>
    </RangerLayout>
  );
}