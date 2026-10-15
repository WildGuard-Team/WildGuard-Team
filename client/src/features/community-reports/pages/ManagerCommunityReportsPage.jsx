import { useEffect, useMemo, useRef, useState } from 'react';
import ParkManagerLayout from '../../conservation-reports/components/ParkManagerLayout.jsx';
import ManagerIcon from '../../conservation-reports/components/ManagerIcon.jsx';
import EvidenceGallery from '../components/EvidenceGallery.jsx';
import ReadOnlyReportMap from '../components/ReadOnlyReportMap.jsx';
import {
  getManagerCommunityReport,
  getManagerCommunityReports,
  reviewCommunityReport,
} from '../services/manager-report.service.js';
import { formatSubmittedDate, reportLocationText } from '../utils/report-display.js';
import { reportTypeLabel } from '../utils/report-options.js';
import wildlifeImage from '../../../assets/community-report-categories/wildlife-sighting.jpg';
import conflictImage from '../../../assets/community-report-categories/human-wildlife-conflict.jpg';
import suspiciousImage from '../../../assets/community-report-categories/suspicious-activity.jpg';
import './submitted-report-details.css';
import './manager-community-reports.css';

const statusTabs = [
  ['', 'All reports'],
  ['under_review', 'Under review'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
];

const categories = [
  { value: 'WILDLIFE_SIGHTING', title: 'Wildlife Sightings', image: wildlifeImage, description: 'Animals observed by community members.' },
  { value: 'HUMAN_WILDLIFE_CONFLICT', title: 'Human–Wildlife Conflict', image: conflictImage, description: 'Incidents affecting people and wildlife.' },
  { value: 'SUSPICIOUS_ACTIVITY', title: 'Suspicious Activity', image: suspiciousImage, description: 'Potential threats, traps or illegal activity.' },
];

const initialFilters = { status: '', reportType: '', search: '', startDate: '', endDate: '' };

export default function ManagerCommunityReportsPage({ navigate }) {
  const [filters, setFilters] = useState(initialFilters);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [decisionError, setDecisionError] = useState('');
  const [notice, setNotice] = useState('');
  const detailCloseRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    getManagerCommunityReports(filters, controller.signal)
      .then((items) => { if (active) { setReports(items); setError(''); } })
      .catch((requestError) => { if (active && requestError.name !== 'AbortError') setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [filters, revision]);

  const counts = useMemo(() => reports.reduce((result, report) => {
    result.total += 1;
    result[report.status] = (result[report.status] ?? 0) + 1;
    return result;
  }, { total: 0, under_review: 0, approved: 0, rejected: 0 }), [reports]);

  function changeStatus(status) {
    setLoading(true);
    setError('');
    const next = { ...filters, status };
    setFilters(next);
    setDraftFilters(next);
  }

  function chooseCategory(reportType) {
    setLoading(true);
    setError('');
    const value = filters.reportType === reportType ? '' : reportType;
    const next = { ...filters, reportType: value };
    setFilters(next);
    setDraftFilters(next);
  }

  function applyFilters(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setFilters({ ...draftFilters });
  }

  function clearFilters() {
    setLoading(true);
    setError('');
    setDraftFilters(initialFilters);
    setFilters(initialFilters);
  }

  async function openReport(reportId) {
    setSelected({ _id: reportId });
    setDetailsLoading(true);
    setDetailsError('');
    setRejecting(false);
    setRejectionReason('');
    setDecisionError('');
    try {
      setSelected(await getManagerCommunityReport(reportId));
      requestAnimationFrame(() => detailCloseRef.current?.focus());
    } catch (requestError) {
      setDetailsError(requestError.message);
    } finally {
      setDetailsLoading(false);
    }
  }

  function refreshReports() {
    setLoading(true);
    setError('');
    setRevision((value) => value + 1);
  }

  function closeReport() {
    if (decisionBusy) return;
    setSelected(null);
    setRejecting(false);
    setDetailsError('');
  }

  async function submitDecision(status) {
    const reason = rejectionReason.trim();
    if (status === 'rejected' && !reason) {
      setDecisionError('Enter a reason before rejecting this report.');
      return;
    }
    setDecisionBusy(true);
    setDecisionError('');
    try {
      const updated = await reviewCommunityReport(selected._id, {
        status,
        ...(status === 'rejected' ? { rejectionReason: reason } : {}),
      });
      setSelected(updated);
      setRejecting(false);
      setRejectionReason('');
      setNotice(`${updated.referenceNumber} was ${status}.`);
      setRevision((value) => value + 1);
    } catch (requestError) {
      setDecisionError(requestError.message);
    } finally {
      setDecisionBusy(false);
    }
  }

  return <ParkManagerLayout navigate={navigate}>
    <section className="manager-community" aria-labelledby="manager-community-title">
      <header className="manager-community__hero">
        <div><span>Community intelligence</span><h1 id="manager-community-title">Community Reports</h1><p>Review reports from every community member and turn verified observations into conservation action.</p></div>
        <div className="manager-community__hero-stat"><strong>{counts.under_review}</strong><span>Awaiting review</span></div>
      </header>

      {notice && <div className="manager-community__notice" role="status"><ManagerIcon name="check" size={18} />{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss notification"><ManagerIcon name="close" size={16} /></button></div>}

      <div className="manager-community__summary" aria-label="Report totals">
        <SummaryCard label="Reports shown" value={counts.total} tone="all" />
        <SummaryCard label="Under review" value={counts.under_review} tone="review" />
        <SummaryCard label="Approved" value={counts.approved} tone="approved" />
        <SummaryCard label="Rejected" value={counts.rejected} tone="rejected" />
      </div>

      <section className="manager-community__categories" aria-labelledby="community-categories-title">
        <div className="manager-community__section-heading"><div><span>Report categories</span><h2 id="community-categories-title">View reports by category</h2></div><small>Select a category to filter the review queue.</small></div>
        <div className="manager-community__category-grid">
          {categories.map((category) => <button key={category.value} type="button" aria-pressed={filters.reportType === category.value} className={filters.reportType === category.value ? 'is-selected' : ''} onClick={() => chooseCategory(category.value)} style={{ '--category-image': `url(${category.image})` }}>
            <span>{category.title}</span><small>{category.description}</small><strong>{filters.reportType === category.value ? 'Showing category' : 'View reports'} <ManagerIcon name="chevron" size={16} /></strong>
          </button>)}
        </div>
      </section>

      <section className="manager-community__workspace" aria-labelledby="review-queue-title">
        <div className="manager-community__section-heading"><div><span>Manager review</span><h2 id="review-queue-title">Report review queue</h2></div><button type="button" className="manager-community__refresh" onClick={refreshReports}><ManagerIcon name="refresh" size={17} />Refresh</button></div>
        <div className="manager-community__tabs" aria-label="Filter by review status">{statusTabs.map(([value, label]) => <button type="button" key={label} aria-pressed={filters.status === value} className={filters.status === value ? 'is-active' : ''} onClick={() => changeStatus(value)}>{label}</button>)}</div>
        <form className="manager-community__filters" onSubmit={applyFilters}>
          <label><span>Search reports</span><input type="search" value={draftFilters.search} maxLength="100" placeholder="Reference, location or description" onChange={(event) => setDraftFilters({ ...draftFilters, search: event.target.value })} /></label>
          <label><span>Report category</span><select value={draftFilters.reportType} onChange={(event) => setDraftFilters({ ...draftFilters, reportType: event.target.value })}><option value="">All categories</option>{categories.map((category) => <option key={category.value} value={category.value}>{category.title}</option>)}</select></label>
          <label><span>From date</span><input type="date" value={draftFilters.startDate} max={draftFilters.endDate || undefined} onChange={(event) => setDraftFilters({ ...draftFilters, startDate: event.target.value })} /></label>
          <label><span>To date</span><input type="date" value={draftFilters.endDate} min={draftFilters.startDate || undefined} onChange={(event) => setDraftFilters({ ...draftFilters, endDate: event.target.value })} /></label>
          <div className="manager-community__filter-actions"><button type="button" onClick={clearFilters}>Clear</button><button type="submit"><ManagerIcon name="filter" size={16} />Apply filters</button></div>
        </form>

        {error && <div className="manager-community__error" role="alert">{error}<button type="button" onClick={refreshReports}>Try again</button></div>}
        <div className="manager-community__table-wrap" aria-busy={loading}>
          {loading ? <LoadingState /> : reports.length ? <table>
            <thead><tr><th>Report</th><th>Community member</th><th>Location</th><th>Submitted</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{reports.map((report) => <tr key={report._id}>
              <td data-label="Report"><strong>{reportTypeLabel(report.reportType)}</strong><small>{report.referenceNumber}</small></td>
              <td data-label="Community member"><strong>{report.reporter?.fullName ?? 'Community member'}</strong><small>{report.reporter?.email ?? 'Email unavailable'}</small></td>
              <td data-label="Location"><span className="manager-community__location">{reportLocationText(report.location)}</span></td>
              <td data-label="Submitted">{formatSubmittedDate(report.createdAt)}</td>
              <td data-label="Status"><ManagerStatus status={report.status} /></td>
              <td><button type="button" className="manager-community__view" onClick={() => openReport(report._id)}>Review <ManagerIcon name="chevron" size={16} /></button></td>
            </tr>)}</tbody>
          </table> : !error && <EmptyState />}
        </div>
      </section>
    </section>
    {selected && <ReportReviewPanel report={selected} loading={detailsLoading} error={detailsError} rejecting={rejecting} rejectionReason={rejectionReason} decisionBusy={decisionBusy} decisionError={decisionError} closeRef={detailCloseRef} onClose={closeReport} onRejecting={setRejecting} onReasonChange={setRejectionReason} onDecision={submitDecision} />}
  </ParkManagerLayout>;
}

function SummaryCard({ label, value, tone }) {
  return <article className={`manager-community__summary-card is-${tone}`}><span>{label}</span><strong>{value}</strong></article>;
}

function ManagerStatus({ status }) {
  const safeStatus = ['approved', 'rejected'].includes(status) ? status : 'under_review';
  const label = { under_review: 'Under review', approved: 'Approved', rejected: 'Rejected' }[safeStatus];
  return <span className={`manager-community__status is-${safeStatus}`}>{label}</span>;
}

function LoadingState() {
  return <div className="manager-community__state" role="status"><span className="loading-mark" /><strong>Loading community reports…</strong></div>;
}

function EmptyState() {
  return <div className="manager-community__state"><ManagerIcon name="reports" size={32} /><strong>No matching reports</strong><span>Try another status, category, date range or search term.</span></div>;
}

function ReportReviewPanel({ report, loading, error, rejecting, rejectionReason, decisionBusy, decisionError, closeRef, onClose, onRejecting, onReasonChange, onDecision }) {
  const ready = !loading && !error && report.referenceNumber;
  return <div className="manager-review-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="manager-review-panel" role="dialog" aria-modal="true" aria-labelledby="manager-review-title">
      <header><div><span>Community report review</span><h2 id="manager-review-title">{ready ? reportTypeLabel(report.reportType) : 'Report details'}</h2></div><button ref={closeRef} type="button" onClick={onClose} aria-label="Close report details"><ManagerIcon name="close" /></button></header>
      {loading ? <LoadingState /> : error ? <div className="manager-community__state is-error"><strong>Unable to load report</strong><span>{error}</span></div> : <div className="manager-review-panel__body">
        <div className="manager-review-panel__meta"><ManagerStatus status={report.status} /><strong>{report.referenceNumber}</strong><span>Submitted {formatSubmittedDate(report.createdAt)}</span></div>
        <section><h3>Community member</h3><dl><div><dt>Name</dt><dd>{report.reporter?.fullName ?? 'Community member'}</dd></div><div><dt>Email</dt><dd>{report.reporter?.email ?? 'Unavailable'}</dd></div></dl></section>
        <section><h3>Incident details</h3><p className="manager-review-panel__description">{report.description}</p><dl><div><dt>Incident observed</dt><dd>{report.incidentDateTime ? formatSubmittedDate(report.incidentDateTime) : 'Not provided'}</dd></div></dl></section>
        <section><h3>Location</h3><p>{reportLocationText(report.location)}</p><ReadOnlyReportMap coordinates={report.location?.coordinates} /></section>
        <section><h3>Evidence</h3><EvidenceGallery evidence={report.evidence ?? []} /></section>
        {report.status === 'rejected' && report.rejectionReason && <section className="manager-review-panel__rejection"><h3>Rejection reason</h3><p>{report.rejectionReason}</p></section>}
        {report.status !== 'under_review' && <section className="manager-review-panel__completed"><ManagerIcon name="check" size={20} /><div><strong>Review completed</strong><span>{report.reviewedAt ? formatSubmittedDate(report.reviewedAt) : 'Status already finalized'}</span></div></section>}
      </div>}
      {ready && report.status === 'under_review' && <footer>
        {decisionError && <p role="alert">{decisionError}</p>}
        {rejecting && <label><span>Reason for rejection <strong>*</strong></span><textarea value={rejectionReason} maxLength="500" rows="4" placeholder="Explain clearly why this report cannot be approved." onChange={(event) => onReasonChange(event.target.value)} /><small>{rejectionReason.trim().length}/500 characters</small></label>}
        <div>{rejecting ? <><button type="button" className="is-secondary" disabled={decisionBusy} onClick={() => onRejecting(false)}>Cancel</button><button type="button" className="is-reject" disabled={decisionBusy || !rejectionReason.trim()} onClick={() => onDecision('rejected')}>{decisionBusy ? 'Rejecting…' : 'Confirm rejection'}</button></> : <><button type="button" className="is-reject" disabled={decisionBusy} onClick={() => onRejecting(true)}><ManagerIcon name="close" size={17} />Reject</button><button type="button" className="is-approve" disabled={decisionBusy} onClick={() => onDecision('approved')}><ManagerIcon name="check" size={17} />{decisionBusy ? 'Approving…' : 'Approve report'}</button></>}</div>
      </footer>}
    </aside>
  </div>;
}
