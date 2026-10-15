import { getReportStatus, getReportStatusInfo } from '../utils/report-status.js';
import './report-status.css';

export default function ReportStatusBadge({ status, compact = false, className = '' }) {
  const value = getReportStatus(status);
  return <span className={`report-status-badge report-status-badge--${value}${compact ? ' report-status-badge--compact' : ''} ${className}`.trim()}>{getReportStatusInfo(value).label}</span>;
}
