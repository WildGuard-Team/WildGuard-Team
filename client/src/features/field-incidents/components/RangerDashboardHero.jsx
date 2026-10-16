import CommunityIcon from '../../community-reports/components/CommunityIcon.jsx';
import patrolImage from '../../../assets/manager-dashboard-hero/patrol-coverage-hero.jpg';

export default function RangerDashboardHero({ fullName, onReport }) {
  return (
    <section className="ranger-dashboard-hero" aria-labelledby="ranger-dashboard-title">
      <img className="ranger-dashboard-hero-image" src={patrolImage}
        alt="Rangers patrolling a forest reserve at sunrise" fetchPriority="high"
        onError={(event) => { event.currentTarget.hidden = true; }} />
      <div className="ranger-dashboard-hero-copy">
        <p className="ranger-dashboard-kicker">Park Ranger Dashboard</p>
        <h1 id="ranger-dashboard-title">Welcome back, {fullName}.</h1>
        <p className="ranger-dashboard-intro">
          Record wildlife incidents and field observations from your assigned patrol area.
        </p>
        <button type="button" className="primary-button" onClick={onReport}>
          Report Field Incident <CommunityIcon name="chevron" size={20} />
        </button>
      </div>
    </section>
  );
}
