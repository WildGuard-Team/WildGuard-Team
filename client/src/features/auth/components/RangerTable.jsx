import RangerStatusBadge from './RangerStatusBadge.jsx';

export default function RangerTable({ rangers, processingId, onApproval }) {
  const isProcessing = Boolean(processingId);

  return (
    <div className="cr-table-card">
      <div className="cr-table-heading">
        <h2>Ranger registrations</h2>
        <span>
          {rangers.length} Ranger{rangers.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="cr-table-scroll">
        <table aria-label="Ranger registrations">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Ranger ID</th>
              <th scope="col">Email</th>
              <th scope="col">Assigned Park</th>
              <th scope="col">Status</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>

          <tbody>
            {rangers.map((ranger) => (
              <tr key={ranger._id}>
                <td><strong>{ranger.fullName}</strong></td>
                <td>{ranger.rangerId}</td>
                <td>{ranger.email}</td>
                <td>{ranger.assignedPark}</td>
                <td>
                  <RangerStatusBadge status={ranger.approvalStatus} />
                </td>
                <td>
                  {ranger.approvalStatus === 'PENDING' ? (
                    <div className="ranger-approval-actions">
                      <button
                        type="button"
                        className="ranger-approve-button"
                        disabled={isProcessing}
                        onClick={() => onApproval(ranger._id, 'APPROVED')}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="ranger-reject-button"
                        disabled={isProcessing}
                        onClick={() => onApproval(ranger._id, 'REJECTED')}
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="ranger-reviewed-label">Reviewed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
