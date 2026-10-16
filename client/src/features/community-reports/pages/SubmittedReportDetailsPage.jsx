import { useRef, useState } from 'react';
import { Image, Layers, Settings, PawPrint } from 'lucide-react';
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
      {(loading || error) && <button type="button" className="report-details__back" onClick={() => navigate('/reports/my-reports')}><CommunityIcon name="arrow-left" size={18} />Back to My Reports</button>}
      {loading ? <ReportDetailsLoading /> : error ? <ReportDetailsErrorState error={error} retry={retry} navigate={navigate} /> : <>
        <header className="report-details__heading">
          <div className="report-details__hero-copy">
            <button type="button" className="report-details__back" onClick={() => navigate('/reports/my-reports')}><CommunityIcon name="arrow-left" size={18} />Back to My Reports</button>
            <p className="report-details__eyebrow">COMMUNITY REPORT</p><h1 id="report-details-title">{reportTypeLabel(report.reportType)}</h1>
            <div className="report-details__reference">{report.referenceNumber?.length > 70 ? <ExpandedText title="Report reference" action="Read full reference" text={`Reference: ${report.referenceNumber}`} preview={false} /> : <p>Reference: <strong>{report.referenceNumber || 'Not available'}</strong></p>}</div>
            <ReportStatusBadge status={report.status} />
            <p className="report-details__submitted"><CommunityIcon name="calendar" size={18} /><span>Submitted <time dateTime={report.createdAt || undefined}>{formatSubmittedDate(report.createdAt)}</time></span></p>
          </div>
          <aside className="report-details__hero-message"><span className="report-details__hero-message-icon"><CommunityIcon name="document" size={36} /></span><div><strong>Help protect wildlife</strong><p>Your report contributes to safer habitats and stronger conservation efforts.</p></div></aside>
        </header>
          <div className="report-details__middle">
            <section className="report-details__card report-details__incident" aria-labelledby="incident-details-title">
              <h2 id="incident-details-title"><CommunityIcon name="document" size={21} />Incident details</h2>
              <dl className="report-details__facts">
                <div><dt><span className="report-details__fact-icon"><PawPrint size={22} /></span>Report type</dt><dd>{reportTypeLabel(report.reportType)}</dd></div>
                <div><dt><span className="report-details__fact-icon"><CommunityIcon name="document" size={22} /></span>Description</dt><dd className="report-details__description"><ExpandedText title="Full incident description" action="Read full description" text={report.description || 'Description not available.'} /></dd></div>
                <div><dt><span className="report-details__fact-icon"><CommunityIcon name="calendar" size={22} /></span>Date &amp; time</dt><dd>{report.incidentDateTime ? <><span>Incident observed</span> <time dateTime={report.incidentDateTime}>{formatSubmittedDate(report.incidentDateTime)}</time></> : 'Incident date unavailable'}</dd></div>
              </dl>
            </section>
            <section className="report-details__card report-details__location-card" aria-labelledby="report-location-title">
              <h2 id="report-location-title"><CommunityIcon name="pin" size={21} />Location</h2>
              <div className="report-details__location"><ExpandedText title="Report location" action="Read full location" text={reportLocationText(report.location)} />{['GPS', 'MAP', 'MANUAL'].includes(report.location?.source) && <span className="report-details__source">{({ GPS: 'GPS', MAP: 'Map', MANUAL: 'Manual' })[report.location.source]}</span>}</div>
              <ReadOnlyReportMap coordinates={report.location?.coordinates} />
            </section>
          </div>
          <div className="report-details__bottom">
            <section className="report-details__card report-details__evidence-card" aria-labelledby="report-evidence-title">
              <h2 id="report-evidence-title"><Image size={23} />Evidence <small>{Array.isArray(report.evidence) ? report.evidence.length : 0} attached</small></h2>
              <EvidenceGallery evidence={report.evidence ?? []} />
            </section>
            <section className="report-details__card report-details__progress-card"><h2><Layers size={23} />Report progress</h2><ReportProgressTimeline status={report.status} createdAt={report.createdAt} /></section>
            <section className="report-details__card report-details__actions-card"><h2><Settings size={23} />Actions</h2><p className="report-details__status-description">{getReportStatusInfo(report.status).description}</p><p className="report-details__read-only">This submitted report is read-only.</p>
              {report.status === 'rejected' && report.rejectionReason && <div className="report-details__rejection"><h3>Why this report was rejected</h3><ExpandedText title="Why this report was rejected" action="Read full reason" text={report.rejectionReason} preview={false} />{report.reviewedAt && <small>Reviewed {formatSubmittedDate(report.reviewedAt)}</small>}</div>}
            </section>
          </div>
      </>}
    </section>
  </CommunityLayout>;
}

function ExpandedText({ title, action, text, preview = true }) {
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  function close() { dialogRef.current.close(); }
  return <div className="report-details__expandable">
    {preview && <p className="report-details__text-preview">{text}</p>}
      <button type="button" className="report-details__read-more" ref={triggerRef} onClick={() => { setExpanded(true); dialogRef.current.showModal(); }}>{action}</button>
      <dialog className="report-details__text-dialog" ref={dialogRef} aria-label={title} onClose={() => { setExpanded(false); triggerRef.current?.focus(); }} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
        {expanded && <><header><h2>{title}</h2><button type="button" onClick={close} aria-label={`Close ${title.toLowerCase()}`}><CommunityIcon name="close" size={20} />Close</button></header><p>{text}</p></>}
      </dialog>
  </div>;
}

function ReportDetailsLoading() {
  return <div className="report-details__state" role="status"><span className="loading-mark" /><h1 id="report-details-title">Loading report…</h1><p>Retrieving your report details.</p></div>;
}

function ReportDetailsErrorState({ error, retry, navigate }) {
  const missing = error.status === 400 || error.status === 404;
  return <div className="report-details__state" role="alert"><CommunityIcon name={missing ? 'folder' : 'report'} size={38} /><h1 id="report-details-title">{missing ? 'Report not found' : 'Unable to load report'}</h1><p>{error.message}</p><div className="report-details__state-actions">{!missing && error.status !== 401 && error.status !== 403 && <button type="button" className="primary-button" onClick={retry}>Try again</button>}{error.status === 401 && <button type="button" className="primary-button" onClick={() => window.location.assign('/login')}>Sign in again</button>}<button type="button" className="secondary-button" onClick={() => navigate('/reports/my-reports')}>Back to My Reports</button></div></div>;
}
