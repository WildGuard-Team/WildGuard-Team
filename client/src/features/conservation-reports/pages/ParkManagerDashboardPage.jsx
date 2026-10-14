import { useAuth } from '../../../context/useAuth.js';
import ManagerIcon from '../components/ManagerIcon.jsx';
import ParkManagerLayout from '../components/ParkManagerLayout.jsx';
import './conservation-reports.css';
import './park-manager-dashboard.css';

const reportTypes = [
  {
    icon: 'incident',
    title: 'Incident Report',
    description: 'Analyse incidents by type, location, severity and time.',
    accent: 'amber',
  },
  {
    icon: 'route',
    title: 'Patrol Coverage',
    description: 'Measure completed patrols, routes, hours and protected zones.',
    accent: 'emerald',
  },
  {
    icon: 'trend',
    title: 'Conflict Trends',
    description: 'Reveal human–wildlife conflict patterns and hotspot locations.',
    accent: 'blue',
  },
];

const workflow = [
  ['01', 'Choose a report', 'Select the conservation question you need to investigate.'],
  ['02', 'Set precise filters', 'Use date, park, location and report-specific criteria.'],
  ['03', 'Review live results', 'Inspect calculated statistics, charts and detailed records.'],
  ['04', 'Export or share', 'Download a complete PDF or CSV and share the protected report.'],
];

export default function ParkManagerDashboardPage({ navigate }) {
  const { user } = useAuth();
  const firstName = user?.fullName?.trim().split(/\s+/)[0] || 'Manager';

  function openReports() {
    navigate('/manager/reports');
  }

  return <ParkManagerLayout navigate={navigate}>
    <div className="manager-dashboard">
      <section className="manager-dashboard-hero" aria-labelledby="manager-dashboard-title">
        <div className="manager-dashboard-hero-content">
          <span className="manager-dashboard-eyebrow">WildGuard conservation intelligence</span>
          <h1 id="manager-dashboard-title">Welcome back, {firstName}.</h1>
          <p>Transform protected-area records into decisions that support wildlife, patrol teams and neighbouring communities.</p>
          <div className="manager-dashboard-hero-actions">
            <button type="button" onClick={openReports}>Generate a report <ManagerIcon name="chevron" size={18} /></button>
          </div>
        </div>
        <div className="manager-dashboard-hero-caption">
          <strong>Conservation at a glance</strong>
          <span>Incident • Patrol • Conflict</span>
        </div>
      </section>

      <section className="manager-dashboard-section" aria-labelledby="report-tools-title">
        <div className="manager-dashboard-section-heading">
          <div><span>Reporting tools</span><h2 id="report-tools-title">Start a conservation analysis</h2></div>
          <button type="button" onClick={openReports}>View report workspace <ManagerIcon name="chevron" size={17} /></button>
        </div>
        <div className="manager-dashboard-report-grid">
          {reportTypes.map((report) => <button className={`manager-dashboard-report-card is-${report.accent}`} key={report.title} type="button" onClick={openReports}>
            <span className="manager-dashboard-report-icon"><ManagerIcon name={report.icon} size={25} /></span>
            <span><strong>{report.title}</strong><small>{report.description}</small></span>
            <span className="manager-dashboard-card-arrow"><ManagerIcon name="chevron" size={18} /></span>
          </button>)}
        </div>
      </section>

      <div className="manager-dashboard-lower-grid">
        <section className="manager-dashboard-section manager-dashboard-workflow" aria-labelledby="workflow-title">
          <div className="manager-dashboard-section-heading"><div><span>Simple workflow</span><h2 id="workflow-title">From records to action</h2></div></div>
          <ol>{workflow.map(([number, title, description]) => <li key={number}>
            <span>{number}</span><div><strong>{title}</strong><p>{description}</p></div>
          </li>)}</ol>
        </section>

        <aside className="manager-dashboard-confidence" aria-label="Report data information">
          <span className="manager-dashboard-confidence-icon"><ManagerIcon name="check" size={28} /></span>
          <span className="manager-dashboard-eyebrow">Data confidence</span>
          <h2>Results you can trace</h2>
          <p>Every value shown in a report is calculated from records matching your selected filters.</p>
          <ul>
            <li><ManagerIcon name="check" size={16} /> Live database aggregation</li>
            <li><ManagerIcon name="check" size={16} /> Protected manager-owned reports</li>
            <li><ManagerIcon name="check" size={16} /> Clearly disclosed seeded patrol data</li>
            <li><ManagerIcon name="check" size={16} /> Complete charts, tables and exports</li>
          </ul>
          <button type="button" onClick={openReports}>Open Conservation Reports</button>
        </aside>
      </div>
    </div>
  </ParkManagerLayout>;
}
