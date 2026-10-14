const STATUS_CLASSES = {
  PENDING: 'ranger-status-pending',
  APPROVED: 'ranger-status-approved',
  REJECTED: 'ranger-status-rejected',
};

export default function RangerStatusBadge({ status }) {
  return (
    <span
      className={`ranger-status-badge ${STATUS_CLASSES[status] ?? 'ranger-status-unknown'}`}
    >
      {status || 'UNKNOWN'}
    </span>
  );
}
