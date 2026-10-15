import { useEffect, useMemo, useState } from 'react';
import ManagerIcon from '../components/ManagerIcon.jsx';
import ParkManagerLayout from '../components/ParkManagerLayout.jsx';
import { REPORT_TYPES } from '../config/report-options.js';
import { getConservationReportHistory } from '../services/conservation-report.api.js';
import './conservation-reports.css';
import './manager-tools.css';

const reportTypeLookup = Object.fromEntries(REPORT_TYPES.map((type) => [type.value, type]));

export default function ConservationReportHistoryPage({ navigate }) {
  const [reportType, setReportType] = useState('');
  const [page, setPage] = useState(1);
  const [payload, setPayload] = useState({ reports: [], pagination: { page: 1, total: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    getConservationReportHistory({ page, limit: 9, reportType })
      .then((result) => { if (active) setPayload(result); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, reloadKey, reportType]);

  const range = useMemo(() => {
    if (!payload.pagination.total) return 'No saved reports';
    const start = ((payload.pagination.page - 1) * payload.pagination.limit) + 1;
    const end = Math.min(start + payload.reports.length - 1, payload.pagination.total);
    return `Showing ${start}–${end} of ${payload.pagination.total}`;
  }, [payload]);

  function changeType(event) {
    setLoading(true); setError('');
    setReportType(event.target.value);
    setPage(1);
  }

  function changePage(nextPage) {
    setLoading(true); setError(''); setPage(nextPage);
  }

  function retry() {
    setLoading(true); setError(''); setReloadKey((value) => value + 1);
  }

  return <ParkManagerLayout navigate={navigate}>
    <div className="manager-tool-page">
      <header className="manager-tool-heading manager-history-heading">
        <div><span>Operations / Report History</span><h1>Conservation report history</h1><p>Return to your previously generated reports, review their filters and open the complete stored result.</p></div>
        <button type="button" onClick={() => navigate('/manager/reports')}>Generate new report <ManagerIcon name="chevron" size={17} /></button>
      </header>

      <section className="manager-history-toolbar" aria-label="Report history filters">
        <div><strong>Saved reports</strong><span>{range}</span></div>
        <label>Report type<select value={reportType} onChange={changeType}><option value="">All report types</option>{REPORT_TYPES.map((type) => <option value={type.value} key={type.value}>{type.title}</option>)}</select></label>
      </section>

      {error && <div className="manager-tool-error" role="alert"><div><strong>Unable to load report history</strong><span>{error}</span></div><button type="button" onClick={retry}>Try again</button></div>}

      {loading ? <div className="manager-history-grid" aria-label="Loading report history">{Array.from({ length: 6 }, (_, index) => <div className="manager-history-skeleton" key={index} />)}</div>
        : !error && payload.reports.length === 0 ? <section className="manager-tool-empty"><span><ManagerIcon name="history" size={30} /></span><h2>No reports found</h2><p>{reportType ? 'No saved reports match this report type.' : 'Generate your first conservation report to see it here.'}</p><button type="button" onClick={() => navigate('/manager/reports')}>Generate a report</button></section>
          : !error && <div className="manager-history-grid">{payload.reports.map((report) => <HistoryCard report={report} key={report.reportId} onOpen={() => navigate(`/manager/reports?report=${encodeURIComponent(report.reportId)}`)} />)}</div>}

      {!loading && !error && payload.pagination.totalPages > 1 && <nav className="manager-pagination" aria-label="Report history pages">
        <button type="button" disabled={page <= 1} onClick={() => changePage(page - 1)}>Previous</button>
        <span>Page <strong>{page}</strong> of {payload.pagination.totalPages}</span>
        <button type="button" disabled={page >= payload.pagination.totalPages} onClick={() => changePage(page + 1)}>Next</button>
      </nav>}
    </div>
  </ParkManagerLayout>;
}

function HistoryCard({ report, onOpen }) {
  const definition = reportTypeLookup[report.reportType] ?? REPORT_TYPES[0];
  const filters = report.parameters?.filters ?? {};
  const filterValues = [filters.park, filters.location, ...Object.values(filters).filter(Array.isArray).flat()].filter(Boolean);
  return <article className="manager-history-card">
    <div className="manager-history-card-top"><span className={`manager-history-type is-${definition.icon}`}><ManagerIcon name={definition.icon} size={22} /></span><span className="manager-history-date">{formatDate(report.generatedAt)}</span></div>
    <span className="manager-history-label">{definition.title}</span>
    <h2>{report.reportId}</h2>
    <div className="manager-history-period"><ManagerIcon name="calendar" size={17} /><span><small>Reporting period</small><strong>{formatPeriod(report.parameters)}</strong></span></div>
    <div className="manager-history-tags">{filterValues.length ? filterValues.slice(0, 3).map((value) => <span key={value}>{formatValue(value)}</span>) : <span>All locations</span>}{filterValues.length > 3 && <span>+{filterValues.length - 3} more</span>}</div>
    <button type="button" onClick={onOpen}>Open full report <ManagerIcon name="chevron" size={17} /></button>
  </article>;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

function formatPeriod(parameters) {
  const formatter = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const start = new Date(parameters?.startDate); const end = new Date(parameters?.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Not available';
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

function formatValue(value) {
  return String(value).toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
