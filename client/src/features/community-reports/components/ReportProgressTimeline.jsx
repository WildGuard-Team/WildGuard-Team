import CommunityIcon from './CommunityIcon.jsx';
import { getReportStatus, getReportStatusInfo } from '../utils/report-status.js';
import { formatSubmittedDate } from '../utils/report-display.js';

export default function ReportProgressTimeline({ status, submittedAt, createdAt }) {
  const currentStatus = getReportStatus(status);
  const submissionTime = submittedAt || createdAt;
  const parsedSubmissionTime = submissionTime ? new Date(submissionTime) : null;
  const hasSubmissionTime = parsedSubmissionTime && Number.isFinite(parsedSubmissionTime.getTime());
  const isUnderReview = currentStatus === 'under_review';
  const steps = [
    { key: 'submitted', label: 'Submitted', state: 'complete', icon: 'check' },
    {
      key: 'under_review', label: getReportStatusInfo('under_review').title,
      state: isUnderReview ? 'active' : 'complete', icon: isUnderReview ? 'clock' : 'check',
    },
    {
      key: isUnderReview ? 'decision' : currentStatus,
      label: isUnderReview ? 'Approved or rejected' : getReportStatusInfo(currentStatus).title,
      state: isUnderReview ? 'pending' : 'active',
      icon: currentStatus === 'rejected' ? 'close' : 'check-circle',
    },
  ];

  return <ol className="report-timeline" aria-label="Report progress">
    {steps.map((step) => <li key={step.key}
      className={`report-timeline__step report-timeline__step--${step.state}${step.key === 'rejected' ? ' report-timeline__step--rejected' : ''}`}
      aria-current={step.state === 'active' ? 'step' : undefined}>
      <span className="report-timeline__marker"><CommunityIcon name={step.icon} size={18} /></span>
      <div className="report-timeline__content">
        <span className="report-timeline__label">{step.label}</span>
        {step.key === 'submitted' && (hasSubmissionTime
          ? <time className="report-timeline__date" dateTime={parsedSubmissionTime.toISOString()}>{formatSubmittedDate(submissionTime)}</time>
          : <span className="report-timeline__date">Submission date unavailable</span>)}
        {step.state === 'active' && <span className="report-timeline__current">Current status</span>}
      </div>
    </li>)}
  </ol>;
}
