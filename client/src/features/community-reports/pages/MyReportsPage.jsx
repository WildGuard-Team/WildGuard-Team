import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../context/useAuth.js';
import CommunityLayout from '../components/CommunityLayout.jsx';
import CommunityIcon from '../components/CommunityIcon.jsx';
import ReportStatusBadge from '../components/ReportStatusBadge.jsx';
import { getMyReports, submitReport } from '../services/report.service.js';
import { deletePendingReport, getPendingReports, restorePendingSubmission } from '../services/pending-reports.indexeddb.js';
import { reportTypeLabel } from '../utils/report-options.js';
import './my-reports.css';

const filters = [['all', 'All Reports'], ['offline_pending', 'Pending'], ['under_review', 'Under Review'], ['approved', 'Approved'], ['rejected', 'Rejected']];
const empty = { all: 'You have no reports yet.', offline_pending: 'No reports are waiting to be submitted.', under_review: 'You have no reports under review.', approved: 'You have no approved reports yet.', rejected: 'You have no rejected reports.' };

export default function MyReportsPage({ navigate, message = '' }) {
  const { user } = useAuth();
  const [filter, setFilter] = useState('all');
  const [online, setOnline] = useState(navigator.onLine);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState({ reports: [], loading: true, error: '' });
  const [notice, setNotice] = useState(message);
  const [sending, setSending] = useState(new Set());
  const locks = useRef(new Set());
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    async function load() {
      const pendingRequest = filter === 'all' || filter === 'offline_pending' ? getPendingReports(user.id) : Promise.resolve([]);
      const serverRequest = online && filter !== 'offline_pending' ? getMyReports(filter === 'all' ? undefined : filter, controller.signal) : Promise.resolve([]);
      const [pending, server] = await Promise.allSettled([pendingRequest, serverRequest]);
      if (!active) return;
      const reports = [...(pending.status === 'fulfilled' ? pending.value : []), ...(server.status === 'fulfilled' ? server.value : [])];
      reports.sort((a, b) => Date.parse(b.savedAt ?? b.createdAt) - Date.parse(a.savedAt ?? a.createdAt));
      const errors = [];
      if (pending.status === 'rejected') errors.push('Unable to read reports saved on this device. Please try again.');
      if (server.status === 'rejected') errors.push(server.reason.message === 'Failed to fetch' ? 'Unable to load submitted reports. Check your connection.' : server.reason.message);
      setData({ reports, loading: false, error: errors.join(' ') });
    }
    load();
    return () => { active = false; controller.abort(); };
  }, [filter, online, revision, user.id]);

  function reload() {
    setData((current) => ({ ...current, loading: true }));
    setRevision((current) => current + 1);
  }

  async function retry(record) {
    if (navigator.onLine === false) { setNotice('You’re still offline. Try again when connected.'); return; }
    if (locks.current.has(record.clientSubmissionId)) return;
    locks.current.add(record.clientSubmissionId);
    setSending(new Set(locks.current));
    setNotice('');
    try {
      await submitReport(restorePendingSubmission(record));
      try { await deletePendingReport(user.id, record.clientSubmissionId); }
      catch { throw new Error('Report submitted, but the local copy could not be removed. Retrying with the same id is safe.'); }
      setNotice('Report submitted successfully.');
      reload();
    } catch (error) { setNotice(error.message); }
    finally {
      locks.current.delete(record.clientSubmissionId);
      setSending(new Set(locks.current));
    }
  }

  return <CommunityLayout navigate={navigate} active="folder">
    <section className="my-reports" aria-labelledby="my-reports-title">
      <header className="dashboard-welcome my-reports__heading"><p>COMMUNITY REPORTS</p><h1 id="my-reports-title">My Reports</h1><span>View reports saved on this device and submitted to WildGuard.</span></header>
      <div className="my-reports__filters" aria-label="Filter reports">{filters.map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} className={filter === value ? 'is-active' : ''} onClick={() => { if (filter === value) return; setFilter(value); setData({ reports: [], loading: true, error: '' }); }}>{label}</button>)}<button type="button" aria-label="Refresh reports" onClick={reload}><CommunityIcon name="refresh" size={18} /></button></div>
      {notice && <p className="my-reports__notice" role="status">{notice}</p>}
      {!online && <p className="my-reports__notice">You’re offline. Reports saved on this device are available; submitted reports will load when connected.</p>}
      {data.error && <p className="my-reports__error" role="alert">{data.error} <button type="button" onClick={reload}>Try again</button></p>}
      <div className="my-reports__results" aria-busy={data.loading}>
        {data.loading ? <p className="my-reports__empty" role="status">Loading reports…</p> : data.reports.length ? <div className="my-reports__grid">{data.reports.map((report) => <ReportCard key={report._id ?? report.clientSubmissionId} report={report} sending={sending.has(report.clientSubmissionId)} onRetry={() => retry(report)} onViewDetails={() => navigate(`/reports/my-reports/${encodeURIComponent(report._id)}`)} />)}</div> : !data.error && <div className="my-reports__empty"><CommunityIcon name="folder" size={36} /><p>{!online && filter !== 'offline_pending' ? 'Connect to view submitted reports, or select Pending.' : empty[filter]}</p></div>}
      </div>
    </section>
  </CommunityLayout>;
}

function ReportCard({ report, sending, onRetry, onViewDetails }) {
  const pending = report.status === 'offline_pending';
  const coordinates = report.location?.coordinates;
  const location = report.location?.displayName || report.location?.manualLocation || (coordinates ? `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}` : 'Location not available');
  const date = new Date(report.savedAt ?? report.createdAt);
  return <article className="my-report-card">
    <ReportStatusBadge status={report.status} compact className="my-report-card__status" />
    <h2>{reportTypeLabel(report.reportType)}</h2>
    <p className="my-report-card__description" title={report.description}>{report.description}</p>
    <p className="my-report-card__detail"><CommunityIcon name="pin" size={17} /><span>{location}</span></p>
    <p className="my-report-card__detail"><CommunityIcon name="calendar" size={17} /><span>{pending ? 'Saved' : 'Submitted'} {Number.isFinite(date.getTime()) ? date.toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' }) : 'date unavailable'}</span></p>
    {report.referenceNumber && <p className="my-report-card__reference">{report.referenceNumber}</p>}
    {pending && <footer><small>Waiting for an internet connection</small><button type="button" className="primary-button" disabled={sending} onClick={onRetry}><CommunityIcon name="refresh" size={17} />{sending ? 'Submitting…' : 'Retry submit'}</button></footer>}
    {!pending && report._id && <footer><button type="button" className="my-report-card__view-details" onClick={onViewDetails}>View details <CommunityIcon name="chevron" size={17} /></button></footer>}
  </article>;
}

