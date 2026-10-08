import { useEffect, useRef, useState } from 'react';
import ParkManagerLayout from '../../conservation-reports/components/ParkManagerLayout.jsx';
import RangerStatusSummary from '../components/RangerStatusSummary.jsx';
import RangerStatusTabs from '../components/RangerStatusTabs.jsx';
import RangerTable from '../components/RangerTable.jsx';
import { getRangers, updateRangerApproval } from '../services/authApi.js';
import { filterRangers, RANGER_STATUS_FILTERS, summarizeRangers } from '../utils/ranger-management.js';
import './ranger-management.css';

export default function PendingRangersPage({ navigate }) {
  const [rangers, setRangers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [apiError, setApiError] = useState('');
  const [processingId, setProcessingId] = useState('');
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const processingLock = useRef(false);

  useEffect(() => {
    let active = true;

    async function loadRangers() {
      try {
        const result = await getRangers();
        if (active) {
          setRangers(result.rangers ?? []);
          setHasLoaded(true);
        }
      } catch (error) {
        if (active) setApiError(error.message);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadRangers();
    return () => { active = false; };
  }, []);

  async function handleApproval(userId, nextStatus) {
    const ranger = rangers.find((item) => item._id === userId);
    if (processingLock.current || ranger?.approvalStatus !== 'PENDING') return;

    processingLock.current = true;
    setProcessingId(userId);
    setApiError('');
    try {
      const result = await updateRangerApproval(userId, nextStatus);
      setRangers((current) => current.map((item) => (
        item._id === userId ? { ...item, approvalStatus: result.ranger.approvalStatus } : item
      )));
    } catch (error) {
      setApiError(error.message);
    } finally {
      processingLock.current = false;
      setProcessingId('');
    }
  }

  const counts = summarizeRangers(rangers);
  const visibleRangers = filterRangers(rangers, status, search);
  const selectedFilter = RANGER_STATUS_FILTERS.find((filter) => filter.value === status);

  return (
    <ParkManagerLayout navigate={navigate}>
      <div className="cr-workspace ranger-management">
        <header className="cr-page-heading">
          <div>
            <span>Administration / Rangers</span>
            <h1>Ranger Management</h1>
            <p>Review Ranger registrations and view their current approval status.</p>
          </div>
        </header>

        {(isLoading || hasLoaded) && (
          <RangerStatusSummary counts={counts} isLoading={isLoading} />
        )}

        {apiError && (
          <div className="cr-alert cr-alert-error" role="alert">
            <strong>Unable to complete the request</strong>
            <span>{apiError}</span>
          </div>
        )}

        {isLoading && <p className="cr-page-status" role="status">Loading Ranger registrations...</p>}

        {hasLoaded && (
          <>
            <section className="ranger-management-controls" aria-label="Ranger filters">
              <RangerStatusTabs status={status} onChange={setStatus} />
              <div className="ranger-search">
                <label htmlFor="ranger-search">Search Rangers</label>
                <input
                  id="ranger-search"
                  type="search"
                  placeholder="Name, Ranger ID, email or park"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </section>

            {processingId && (
              <p className="ranger-processing-status" role="status">Updating Ranger approval...</p>
            )}

            {visibleRangers.length > 0 ? (
              <RangerTable
                rangers={visibleRangers}
                processingId={processingId}
                onApproval={handleApproval}
              />
            ) : (
              <div className="cr-alert cr-alert-empty" role="status">
                <strong>{selectedFilter.emptyMessage}</strong>
                <span>{search.trim() ? 'Try another search or status filter.' : 'Registrations will appear here when available.'}</span>
              </div>
            )}
          </>
        )}
      </div>
    </ParkManagerLayout>
  );
}
