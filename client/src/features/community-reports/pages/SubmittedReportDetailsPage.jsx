import CommunityLayout from '../components/CommunityLayout.jsx';
import CommunityIcon from '../components/CommunityIcon.jsx';
import ReportStatusBadge from '../components/ReportStatusBadge.jsx';
import ReportProgressTimeline from '../components/ReportProgressTimeline.jsx';
import EvidenceGallery from '../components/EvidenceGallery.jsx';
import ReadOnlyReportMap from '../components/ReadOnlyReportMap.jsx';
import useReportDetails from '../hooks/useReportDetails.js';
import { reportTypeLabel } from '../utils/report-options.js';
import { getReportStatusInfo } from '../utils/report-status.js';
import { formatSubmittedDate, reportLocationText } from '../utils/report-display.js';
import './submitted-report-details.css';

export default function SubmittedReportDetailsPage({ reportId, navigate }) {
  const { report, loading, error, retry } = useReportDetails(reportId);
  return <CommunityLayout navigate={navigate} active="folder">
    <section className="report-details" aria-labelledby="report-details-title" aria-busy={loading}>
      <button type="button" className="report-details__back" onClick={() => navigate('/reports/my-reports')}><CommunityIcon name="arrow-left" size={18} />Back to My Reports</button>
      {loading ? <ReportDetailsLoading /> : error ? <ReportDetailsErrorState error={error} retry={retry} navigate={navigate} /> : <>
        <header className="report-details__heading">
          <div><p className="report-details__eyebrow">COMMUNITY REPORT</p><h1 id="report-details-title">{reportTypeLabel(report.reportType)}</h1><p className="report-details__reference">Reference: <strong>{report.referenceNumber || 'Not available'}</strong></p></div>
          <ReportStatusBadge status={report.status} />
        </header>
        <div className="report-details__body">
          <div className="report-details__main">
            <section className="report-details__card" aria-labelledby="incident-details-title">
              <h2 id="incident-details-title"><CommunityIcon name="document" size={21} />Incident details</h2>
              <dl className="report-details__facts"><div><dt>Report type</dt><dd>{reportTypeLabel(report.reportType)}</dd></div><div><dt>Description</dt><dd className="report-details__description">{report.description || 'Description not available.'}</dd></div></dl>
              <p className="report-details__date"><CommunityIcon name="calendar" size={18} /><span>Submitted <time dateTime={report.createdAt || undefined}>{formatSubmittedDate(report.createdAt)}</time></span></p>
              {report.incidentDateTime && <p className="report-details__date"><CommunityIcon name="clock" size={18} /><span>Incident observed <time dateTime={report.incidentDateTime}>{formatSubmittedDate(report.incidentDateTime)}</time></span></p>}
            </section>
            <section className="report-details__card" aria-labelledby="report-location-title">
              <h2 id="report-location-title"><CommunityIcon name="pin" size={21} />Location</h2>
              <div className="report-details__location"><p>{reportLocationText(report.location)}</p>{['GPS', 'MAP', 'MANUAL'].includes(report.location?.source) && <span className="report-details__source">{({ GPS: 'GPS', MAP: 'Map', MANUAL: 'Manual' })[report.location.source]}</span>}</div>
              <ReadOnlyReportMap coordinates={report.location?.coordinates} />
            </section>
            <section className="report-details__card" aria-labelledby="report-evidence-title">
              <h2 id="report-evidence-title"><CommunityIcon name="folder" size={21} />Evidence</h2>
              <EvidenceGallery evidence={report.evidence ?? []} />
            </section>
          </div>
          <aside className="report-details__aside" aria-label="Report status and progress">
            <section className="report-details__card"><h2>Report status</h2><ReportStatusBadge status={report.status} /><p className="report-details__status-description">{getReportStatusInfo(report.status).description}</p></section>
            <section className="report-details__card"><h2>Report progress</h2><ReportProgressTimeline status={report.status} createdAt={report.createdAt} /></section>
          </aside>
        </div>
      </>}
    </section>
  </CommunityLayout>;
}

function ReportDetailsLoading() {
  return <div className="report-details__state" role="status"><span className="loading-mark" /><h1 id="report-details-title">Loading report…</h1><p>Retrieving your report details.</p></div>;
}

function ReportDetailsErrorState({ error, retry, navigate }) {
  const missing = error.status === 400 || error.status === 404;
  return <div className="report-details__state" role="alert"><CommunityIcon name={missing ? 'folder' : 'report'} size={38} /><h1 id="report-details-title">{missing ? 'Report not found' : 'Unable to load report'}</h1><p>{error.message}</p><div className="report-details__state-actions">{!missing && error.status !== 401 && error.status !== 403 && <button type="button" className="primary-button" onClick={retry}>Try again</button>}{error.status === 401 && <button type="button" className="primary-button" onClick={() => window.location.assign('/login')}>Sign in again</button>}<button type="button" className="secondary-button" onClick={() => navigate('/reports/my-reports')}>Back to My Reports</button></div></div>;
}
