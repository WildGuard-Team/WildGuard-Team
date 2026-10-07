import { useState } from 'react';
import { formatOption, REPORT_TYPES } from '../config/report-options.js';
import {
  downloadReportCsv, downloadReportPdf, shareReport,
} from '../services/report-delivery.service.js';
import ManagerIcon from './ManagerIcon.jsx';
import { BarChart, LineChart } from './ReportCharts.jsx';

export default function ReportResults({ report, onGenerateAnother }) {
  const definition = REPORT_TYPES.find((item) => item.value === report.reportType);
  const [activeAction, setActiveAction] = useState('');
  const [deliveryMessage, setDeliveryMessage] = useState(null);

  async function deliver(action, operation, successMessage) {
    setActiveAction(action);
    setDeliveryMessage(null);
    try {
      await operation();
      setDeliveryMessage({ kind: 'success', text: successMessage });
    } catch (error) {
      if (error?.name !== 'AbortError') {
        setDeliveryMessage({ kind: 'error', text: error.message });
      }
    } finally {
      setActiveAction('');
    }
  }

  return <div className="cr-results" aria-live="polite">
    <section className="cr-report-banner"><div className="cr-success-mark"><ManagerIcon name="check" size={25} /></div><div><span>Report generated successfully</span><h1>{definition?.title ?? formatOption(report.reportType)}</h1><p>All statistics and chart values reflect the selected filters.</p></div><button type="button" className="cr-secondary-button" onClick={onGenerateAnother}><ManagerIcon name="refresh" size={18} />Generate another</button></section>
    <ReportMetadata report={report} />
    <section className="cr-delivery-toolbar" aria-label="Export and share report">
      <div><strong>Export or share</strong><span>The generated report remains available if an export fails.</span></div>
      <div className="cr-delivery-actions">
        <button type="button" disabled={Boolean(activeAction)} onClick={() => deliver('csv', () => downloadReportCsv(report.reportId), 'CSV downloaded successfully.')}><ManagerIcon name="download" size={18} />{activeAction === 'csv' ? 'Exporting…' : 'Export CSV'}</button>
        <button type="button" disabled={Boolean(activeAction)} onClick={() => deliver('pdf', () => downloadReportPdf(report.reportId), 'PDF downloaded successfully.')}><ManagerIcon name="download" size={18} />{activeAction === 'pdf' ? 'Preparing PDF…' : 'Download PDF'}</button>
        <button type="button" disabled={Boolean(activeAction)} onClick={() => deliver('share', () => shareReport(report), 'Report link shared or copied successfully.')}><ManagerIcon name="share" size={18} />{activeAction === 'share' ? 'Sharing…' : 'Share report'}</button>
      </div>
    </section>
    {deliveryMessage && <div className={`cr-delivery-message is-${deliveryMessage.kind}`} role={deliveryMessage.kind === 'error' ? 'alert' : 'status'}>{deliveryMessage.text}</div>}
    {report.results.dataSource && <div className="cr-seed-notice"><strong>Data source</strong><span>{report.results.dataSource.label}. This report does not represent a live patrol-recording module.</span></div>}
    {report.reportType === 'INCIDENT_REPORT' && <IncidentResults results={report.results} />}
    {report.reportType === 'PATROL_COVERAGE_REPORT' && <PatrolResults results={report.results} />}
    {report.reportType === 'CONFLICT_TREND_REPORT' && <ConflictResults results={report.results} />}
    <div className="cr-results-footer"><button type="button" className="cr-primary-button" onClick={onGenerateAnother}><ManagerIcon name="refresh" size={18} />Generate another report</button></div>
  </div>;
}

function ReportMetadata({ report }) {
  const filterEntries = Object.entries(report.parameters.filters ?? {});
  return <section className="cr-metadata"><div><span>Report ID</span><strong>{report.reportId}</strong></div><div><span>Reporting period</span><strong>{formatDate(report.parameters.startDate)} – {formatDate(report.parameters.endDate)}</strong></div><div><span>Generated</span><strong>{formatDateTime(report.generatedAt)}</strong></div>{filterEntries.length > 0 && <div className="cr-meta-filters"><span>Applied filters</span><p>{filterEntries.map(([key, value]) => <i key={key}>{formatOption(key)}: {formatFilterValue(value)}</i>)}</p></div>}</section>;
}

function IncidentResults({ results }) {
  const { summary, breakdowns } = results;
  return <>
    <MetricGrid metrics={[
      ['Total incidents', summary.totalIncidents], ['Locations affected', summary.distinctLocations],
      ['High severity', summary.highSeverityIncidents], ['Critical incidents', summary.criticalIncidents],
      ['Daily average', summary.averageIncidentsPerDay],
    ]} />
    <div className="cr-chart-grid"><LineChart title={`Incidents by ${results.timeGranularity.toLowerCase()}`} data={breakdowns.byTime} /><BarChart title="Incidents by type" data={breakdowns.byType} /><BarChart title="Severity distribution" data={breakdowns.bySeverity} /><BarChart title="Top locations" data={breakdowns.byLocation.slice(0, 6)} /></div>
    <DataTable title="Incident records" columns={['Date', 'Type', 'Severity', 'Park', 'Location', 'Species']} rows={results.incidents.map((item) => [formatDateTime(item.occurredAt), formatOption(item.incidentType), item.severity, item.park, item.location, item.species ?? 'Not recorded'])} />
  </>;
}

function PatrolResults({ results }) {
  const { summary, breakdowns } = results;
  return <>
    <MetricGrid metrics={[
      ['Total patrols', summary.totalPatrols], ['Completed', summary.completedPatrols],
      ['Distance', summary.totalDistanceKm, ' km'], ['Patrol hours', summary.totalPatrolHours, ' hrs'],
      ['Route coverage', summary.routeCoveragePercent, '%'], ['Zone coverage', summary.zoneCoveragePercent, '%'],
      ['Completion rate', summary.completionRatePercent, '%'], ['Observations', summary.observations],
    ]} />
    <div className="cr-chart-grid"><LineChart title="Daily distance covered" data={breakdowns.byDate} valueKey="distanceKm" valueSuffix=" km" /><BarChart title="Patrol status" data={breakdowns.byStatus} /><BarChart title="Completed patrols by route" data={breakdowns.byRoute} labelKey="routeName" valueKey="completedPatrols" /></div>
    <DataTable title="Route coverage" columns={['Route', 'Patrols', 'Completed', 'Distance', 'Hours', 'Zone coverage']} rows={breakdowns.byRoute.map((item) => [item.routeName, item.totalPatrols, item.completedPatrols, `${item.distanceKm} km`, item.patrolHours, `${item.zoneCoveragePercent}%`])} />
    <DataTable title="Patrol records" columns={['Started', 'Route', 'Team', 'Status', 'Distance', 'Duration', 'Zones']} rows={results.patrols.map((item) => [formatDateTime(item.startedAt), item.routeName, item.rangerTeam, formatOption(item.status), `${item.distanceKm} km`, `${item.durationHours} hrs`, item.zonesCovered.join(', ') || 'None'])} />
  </>;
}

function ConflictResults({ results }) {
  const { summary, breakdowns } = results;
  const trendLabel = summary.trendChangePercent === null ? 'No baseline' : `${summary.trendChangePercent > 0 ? '+' : ''}${summary.trendChangePercent}%`;
  return <>
    <MetricGrid metrics={[
      ['Total conflicts', summary.totalConflicts], ['Locations affected', summary.distinctLocations],
      ['High risk', summary.highRiskConflicts], ['Critical', summary.criticalConflicts],
      ['Trend', formatOption(summary.trendDirection), ` (${trendLabel})`],
      ['Top hotspot', summary.topHotspot?.label ?? 'Not available'],
    ]} />
    <div className="cr-chart-grid"><LineChart title={`Conflict trend by ${results.timeGranularity.toLowerCase()}`} data={breakdowns.byTime} /><BarChart title="Conflict types" data={breakdowns.byConflictType} /><BarChart title="Conflict hotspots" data={breakdowns.byLocation.slice(0, 6)} /><BarChart title="Species involved" data={breakdowns.bySpecies} /></div>
    <DataTable title="Conflict records" columns={['Date', 'Conflict type', 'Severity', 'Park', 'Location', 'Species']} rows={results.conflicts.map((item) => [formatDateTime(item.occurredAt), formatOption(item.conflictType), item.severity, item.park, item.location, item.species])} />
  </>;
}

function MetricGrid({ metrics }) {
  return <section className="cr-metric-grid" aria-label="Report statistics">{metrics.map(([label, value, suffix = '']) => <article key={label}><span>{label}</span><strong>{value}{suffix}</strong></article>)}</section>;
}

function DataTable({ title, columns, rows }) {
  return <section className="cr-table-card"><div className="cr-table-heading"><h2>{title}</h2><span>{rows.length} records</span></div><div className="cr-table-scroll"><table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={`${title}-${rowIndex}`}>{row.map((cell, cellIndex) => <td key={`${columns[cellIndex]}-${cellIndex}`}>{cell}</td>)}</tr>)}</tbody></table></div></section>;
}

function formatFilterValue(value) {
  return Array.isArray(value) ? value.map(formatOption).join(', ') : value;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(value));
}
