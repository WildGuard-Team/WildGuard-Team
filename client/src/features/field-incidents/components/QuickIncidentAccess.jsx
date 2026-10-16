import CommunityIcon from '../../community-reports/components/CommunityIcon.jsx';
import { fieldIncidentTypes } from '../utils/field-incident-options.js';
import QuickIncidentCard from './QuickIncidentCard.jsx';
import './quick-incident-access.css';

export default function QuickIncidentAccess({ onSelectType, onViewAll }) {
  return (
    <section className="ranger-quick-access" aria-labelledby="ranger-quick-title">
      <header className="ranger-quick-heading">
        <div>
          <h2 id="ranger-quick-title">Quick Incident Access</h2>
          <p>Choose an incident type to start a new report.</p>
        </div>
        <button type="button" className="ranger-quick-view-all" onClick={onViewAll}>
          View all incident types <CommunityIcon name="chevron" size={17} />
        </button>
      </header>
      <div className="ranger-quick-grid">
        {fieldIncidentTypes.map((type) => (
          <QuickIncidentCard key={type.value} type={type} onSelectType={onSelectType} />
        ))}
      </div>
    </section>
  );
}
