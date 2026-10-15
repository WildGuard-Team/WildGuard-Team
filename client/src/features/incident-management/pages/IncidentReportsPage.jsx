import { useCallback, useReducer, useState } from 'react';
import { useAuth } from '../../../context/useAuth.js';
import ParkManagerLayout from '../../conservation-reports/components/ParkManagerLayout.jsx';
import FieldIncidentDetailsModal from '../../field-incidents/components/FieldIncidentDetailsModal.jsx';
import IncidentManagementFilters from '../components/IncidentManagementFilters.jsx';
import IncidentManagementPagination from '../components/IncidentManagementPagination.jsx';
import IncidentManagementTable from '../components/IncidentManagementTable.jsx';
import useIncidentReports from '../hooks/useIncidentReports.js';
import { createIncidentManagementQuery, incidentManagementQueryReducer } from '../utils/incident-management-query.js';
import '../../conservation-reports/pages/conservation-reports.css';
import './incident-reports.css';

const statisticsCards = [
  ['total', 'Total Incident Reports'], ['low', 'Low Risk Reports'],
  ['medium', 'Medium Risk Reports'], ['high', 'High Risk Reports'],
];

export default function IncidentReportsPage({ navigate }) {
  const { user } = useAuth();
  const [query, dispatch] = useReducer(incidentManagementQueryReducer, undefined, createIncidentManagementQuery);
  const [selectedId, setSelectedId] = useState('');
  const closeDetails = useCallback(() => setSelectedId(''), []);
  const { incidents, statistics, pagination, parks, isLoading, error, validationError, refresh } = useIncidentReports(user.id, query);
  const selectedIncident = incidents.find((incident) => incident.id === selectedId);
  const hasFilters = ['search', 'incidentType', 'riskLevel', 'parkZone', 'startDate', 'endDate', 'status']
    .some((name) => Boolean(query[name]));

  function updateQuery(action) {
    setSelectedId('');
    dispatch(action);
  }

  function refreshReports() {
    setSelectedId('');
    dispatch({ type: 'page', value: 1 });
    refresh();
  }

  return (
    <ParkManagerLayout navigate={navigate}>
      <div className="cr-workspace incident-management">
        <header className="cr-page-heading">
          <div>
            <span>Operations / Incident Reports</span>
            <h1>Incident Reports</h1>
            <p>View and monitor field incident reports submitted by Park Rangers.</p>
          </div>
          <button type="button" className="cr-secondary-button im-refresh" onClick={refreshReports} disabled={isLoading}>
            {isLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </header>

        <section className="cr-metric-grid im-statistics" aria-label="Incident report statistics">
          {statisticsCards.map(([name, label]) => (
            <article key={name} className={`im-statistic-${name}`}>
              <span>{label}</span>
              <strong>{statistics ? statistics[name].toLocaleString() : '—'}</strong>
            </article>
          ))}
        </section>
        <p className="im-statistics-note">All submitted reports within your authorized parks and zones.</p>

        <IncidentManagementFilters query={query} parks={parks} onChange={updateQuery}
          onClear={() => updateQuery({ type: 'clear' })} validationError={validationError} />

        {error && (
          <div className="cr-alert cr-alert-error im-load-error" role="alert">
            <div><strong>Unable to load incident reports.</strong><p>{error}</p></div>
            <button type="button" className="cr-secondary-button im-small-button" onClick={refreshReports}>Retry</button>
          </div>
        )}

        <section className="cr-table-card im-records" aria-label="Incident report records" aria-busy={isLoading}>
          <div className="cr-table-heading">
            <h2>Submitted incident reports</h2>
            <span>{pagination ? `${pagination.total.toLocaleString()} ${pagination.total === 1 ? 'report' : 'reports'}` : 'Live database records'}</span>
          </div>
          {isLoading && <div className="im-table-status" role="status"><i className="cr-button-spinner" />Loading incident reports…</div>}
          {!isLoading && !error && !validationError && incidents.length > 0 && <IncidentManagementTable incidents={incidents} onView={setSelectedId} />}
          {!isLoading && !error && !validationError && incidents.length === 0 && (
            <div className="im-table-status im-empty" role="status">
              <h3>{hasFilters ? 'No incident reports match your filters.' : 'No incident reports yet.'}</h3>
              <p>{hasFilters ? 'Try another search or clear the filters to see all authorized reports.' : 'Reports submitted by rangers in your authorized parks and zones will appear here.'}</p>
              {hasFilters && <button type="button" className="cr-secondary-button im-small-button" onClick={() => updateQuery({ type: 'clear' })}>Clear Filters</button>}
            </div>
          )}
          {validationError && <p className="im-table-status">Update the date range to view incident reports.</p>}
          {error && <p className="im-table-status">Incident reports are unavailable. Use Retry to load them again.</p>}
          <IncidentManagementPagination pagination={pagination} query={query} onChange={updateQuery} disabled={isLoading || Boolean(error || validationError)} />
        </section>

        {selectedIncident && <FieldIncidentDetailsModal incident={selectedIncident} onClose={closeDetails} showRanger />}
      </div>
    </ParkManagerLayout>
  );
}
