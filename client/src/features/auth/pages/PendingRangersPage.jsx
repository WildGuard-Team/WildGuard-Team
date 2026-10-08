import { useEffect, useState } from 'react';

import ParkManagerLayout
  from '../../conservation-reports/components/ParkManagerLayout.jsx';

import {
  getPendingRangers,
  updateRangerApproval,
} from '../services/authApi.js';

export default function PendingRangersPage({ navigate }) {
  const [rangers, setRangers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [processingId, setProcessingId] = useState('');

  useEffect(() => {
    loadPendingRangers();
  }, []);

  async function loadPendingRangers() {
    setIsLoading(true);
    setApiError('');

    try {
      const result = await getPendingRangers();
      setRangers(result.rangers ?? []);
    } catch (error) {
      setApiError(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApproval(userId, status) {
    setProcessingId(userId);
    setApiError('');

    try {
      await updateRangerApproval(userId, status);

      setRangers((current) =>
        current.filter((ranger) => ranger._id !== userId)
      );
    } catch (error) {
      setApiError(error.message);
    } finally {
      setProcessingId('');
    }
  }

  return (
    <ParkManagerLayout navigate={navigate}>
      <div className="cr-workspace">
        <header className="cr-page-heading">
          <div>
            <span>Administration / Rangers</span>

            <h1>Ranger Approval Requests</h1>

            <p>
              Review Park Ranger registrations before
              allowing them to access WildGuard.
            </p>
          </div>
        </header>

        {apiError && (
          <div
            className="cr-alert cr-alert-error"
            role="alert"
          >
            <strong>Unable to complete the request</strong>
            <span>{apiError}</span>
          </div>
        )}

        {isLoading && (
          <div className="cr-page-status">
            Loading Ranger requests...
          </div>
        )}

        {!isLoading && rangers.length === 0 && (
          <div
            className="cr-alert cr-alert-empty"
            role="status"
          >
            <strong>No pending Ranger requests</strong>

            <span>
              All Ranger registrations have been reviewed.
            </span>
          </div>
        )}

        {rangers.length > 0 && (
          <div className="cr-table-card">
            <div className="cr-table-heading">
              <h2>Pending Rangers</h2>

              <span>
                {rangers.length} request
                {rangers.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="cr-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Ranger ID</th>
                    <th>Email</th>
                    <th>Assigned Park</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {rangers.map((ranger) => (
                    <tr key={ranger._id}>
                      <td>
                        <strong>{ranger.fullName}</strong>
                      </td>

                      <td>{ranger.rangerId}</td>

                      <td>{ranger.email}</td>

                      <td>{ranger.assignedPark}</td>

                      <td>{ranger.approvalStatus}</td>

                      <td>
                        <div className="ranger-approval-actions">
                          <button
                            type="button"
                            className="ranger-approve-button"
                            disabled={processingId === ranger._id}
                            onClick={() =>
                              handleApproval(
                                ranger._id,
                                'APPROVED',
                              )
                            }
                          >
                            Approve
                          </button>

                          <button
                            type="button"
                            className="ranger-reject-button"
                            disabled={processingId === ranger._id}
                            onClick={() =>
                              handleApproval(
                                ranger._id,
                                'REJECTED',
                              )
                            }
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ParkManagerLayout>
  );
}