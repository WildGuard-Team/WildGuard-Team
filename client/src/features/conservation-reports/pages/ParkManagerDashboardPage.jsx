import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/useAuth.js';
import ManagerIcon from '../components/ManagerIcon.jsx';
import ParkManagerLayout from '../components/ParkManagerLayout.jsx';
import CommunityIcon from '../../community-reports/components/CommunityIcon.jsx';
import incidentImage from '../../../assets/manager-dashboard-reports/incident-report-ai.jpg';
import patrolImage from '../../../assets/manager-dashboard-reports/patrol-coverage-ai.jpg';
import conflictImage from '../../../assets/manager-dashboard-reports/conflict-trends-ai.jpg';
import wildlifeSightingImage from '../../../assets/community-report-categories/wildlife-sighting.jpg';
import communityConflictImage from '../../../assets/community-report-categories/human-wildlife-conflict.jpg';
import suspiciousActivityImage from '../../../assets/community-report-categories/suspicious-activity.jpg';
import './conservation-reports.css';
import './park-manager-dashboard.css';

const reportTypes = [
  {
    icon: 'incident',
    value: 'INCIDENT_REPORT',
    title: 'Incident Report',
    description: 'Analyse incidents by type, location, severity and time.',
    heroTitle: 'Turn field observations into timely action.',
    heroDescription: 'Investigate incident patterns, severity and locations with evidence-backed analysis.',
    image: incidentImage,
    accent: 'amber',
  },
  {
    icon: 'route',
    value: 'PATROL_COVERAGE_REPORT',
    title: 'Patrol Coverage',
    description: 'Measure completed patrols, routes, hours and protected zones.',
    heroTitle: 'See where every patrol makes a difference.',
    heroDescription: 'Measure route completion, protected-zone coverage and operational reach across parks.',
    image: patrolImage,
    accent: 'emerald',
  },
  {
    icon: 'trend',
    value: 'CONFLICT_TREND_REPORT',
    title: 'Conflict Trends',
    description: 'Reveal human–wildlife conflict patterns and hotspot locations.',
    heroTitle: 'Recognise conflict patterns before they escalate.',
    heroDescription: 'Track changing hotspots and recurring community–wildlife interactions over time.',
    image: conflictImage,
    accent: 'blue',
  },
];

const workflow = [
  ['01', 'Choose a report', 'Select the conservation question you need to investigate.'],
  ['02', 'Set precise filters', 'Use date, park, location and report-specific criteria.'],
  ['03', 'Review live results', 'Inspect calculated statistics, charts and detailed records.'],
  ['04', 'Export or share', 'Download a complete PDF or CSV and share the protected report.'],
];

const communityReportTypes = [
  {
    value: 'WILDLIFE_SIGHTING', icon: 'paw', title: 'Wildlife Sighting',
    description: 'Review wildlife observations submitted by community members.', image: wildlifeSightingImage,
  },
  {
    value: 'HUMAN_WILDLIFE_CONFLICT', icon: 'users', title: 'Human–Wildlife Conflict',
    description: 'Assess reported interactions affecting people and wildlife.', image: communityConflictImage,
  },
  {
    value: 'SUSPICIOUS_ACTIVITY', icon: 'shield', title: 'Suspicious Activity',
    description: 'Investigate possible threats, traps and illegal activities.', image: suspiciousActivityImage,
  },
];

export default function ParkManagerDashboardPage({ navigate }) {
  const { user } = useAuth();
  const firstName = user?.fullName?.trim().split(/\s+/)[0] || 'Manager';
  const [activeSlide, setActiveSlide] = useState(0);
  const [carouselPaused, setCarouselPaused] = useState(false);
  const currentSlide = reportTypes[activeSlide];

  useEffect(() => {
    if (carouselPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % reportTypes.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [carouselPaused]);

  function openReports(reportType) {
    const query = typeof reportType === 'string'
      ? `?type=${encodeURIComponent(reportType)}`
      : '';
    navigate(`/manager/reports${query}`);
  }

  function openCommunityReports() {
    navigate('/manager/community-reports');
  }

  function openCommunityReportType(reportType) {
    navigate(`/manager/community-reports?reportType=${encodeURIComponent(reportType)}`);
  }

  return <ParkManagerLayout navigate={navigate}>
    <div className="manager-dashboard">
      <section className="manager-dashboard-hero" aria-roledescription="carousel" aria-label="Conservation report highlights" onMouseEnter={() => setCarouselPaused(true)} onMouseLeave={() => setCarouselPaused(false)} onFocusCapture={() => setCarouselPaused(true)} onBlurCapture={() => setCarouselPaused(false)}>
        <div className="manager-dashboard-hero-media" aria-hidden="true">
          {reportTypes.map((report, index) => <img key={report.value} className={index === activeSlide ? 'is-active' : ''} src={report.image} alt="" />)}
        </div>
        <div className="manager-dashboard-hero-content" key={currentSlide.value}>
          <span className="manager-dashboard-eyebrow">Welcome back, {firstName} · {currentSlide.title}</span>
          <span className="manager-dashboard-hero-icon"><ManagerIcon name={currentSlide.icon} size={25} /></span>
          <h1 id="manager-dashboard-title">{currentSlide.heroTitle}</h1>
          <p>{currentSlide.heroDescription}</p>
          <div className="manager-dashboard-hero-actions">
            <button type="button" onClick={() => openReports(currentSlide.value)}>Generate {currentSlide.title.toLowerCase()} <ManagerIcon name="chevron" size={18} /></button>
            <button type="button" className="manager-dashboard-community-action" onClick={openCommunityReports}>Review community reports <ManagerIcon name="chevron" size={18} /></button>
          </div>
        </div>
        <div className="manager-dashboard-carousel-controls" aria-label="Choose dashboard highlight">
          <button type="button" className="manager-dashboard-slide-arrow is-previous" onClick={() => setActiveSlide((activeSlide - 1 + reportTypes.length) % reportTypes.length)} aria-label="Previous highlight"><ManagerIcon name="chevron" size={18} /></button>
          <div>{reportTypes.map((report, index) => <button key={report.value} type="button" className={index === activeSlide ? 'is-active' : ''} onClick={() => setActiveSlide(index)} aria-label={`Show ${report.title}`} aria-current={index === activeSlide ? 'true' : undefined} />)}</div>
          <button type="button" className="manager-dashboard-slide-arrow" onClick={() => setActiveSlide((activeSlide + 1) % reportTypes.length)} aria-label="Next highlight"><ManagerIcon name="chevron" size={18} /></button>
        </div>
      </section>

      <section className="manager-dashboard-section" aria-labelledby="report-tools-title">
        <div className="manager-dashboard-section-heading">
          <div><span>Reporting tools</span><h2 id="report-tools-title">Start a conservation analysis</h2></div>
          <button type="button" onClick={openReports}>View report workspace <ManagerIcon name="chevron" size={17} /></button>
        </div>
        <div className="manager-dashboard-report-grid">
          {reportTypes.map((report) => <button className={`manager-dashboard-report-card is-${report.accent}`} style={{ '--report-image': `url(${report.image})` }} key={report.title} type="button" onClick={() => openReports(report.value)}>
            <span className="manager-dashboard-report-icon"><ManagerIcon name={report.icon} size={25} /></span>
            <span><strong>{report.title}</strong><small>{report.description}</small></span>
            <span className="manager-dashboard-card-arrow"><ManagerIcon name="chevron" size={18} /></span>
          </button>)}
        </div>
      </section>

      <section className="manager-dashboard-section manager-dashboard-community-section" aria-labelledby="community-report-tools-title">
        <div className="manager-dashboard-section-heading">
          <div><span>Community reports</span><h2 id="community-report-tools-title">Review reports from the community</h2></div>
          <button type="button" onClick={openCommunityReports}>View review queue <ManagerIcon name="chevron" size={17} /></button>
        </div>
        <div className="manager-dashboard-community-grid">
          {communityReportTypes.map((report) => <button key={report.value} type="button" style={{ '--community-image': `url(${report.image})` }} onClick={() => openCommunityReportType(report.value)}>
            <span className="manager-dashboard-community-icon"><CommunityIcon name={report.icon} size={25} /></span>
            <span><strong>{report.title}</strong><small>{report.description}</small></span>
            <span className="manager-dashboard-community-link">Review reports <ManagerIcon name="chevron" size={16} /></span>
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
