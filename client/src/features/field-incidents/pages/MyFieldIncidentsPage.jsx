import { useCallback, useState } from 'react';
import { useAuth } from '../../../context/useAuth.js';
import FieldIncidentDetailsModal from '../components/FieldIncidentDetailsModal.jsx';
import FieldIncidentFilters from '../components/FieldIncidentFilters.jsx';
import FieldIncidentSummary from '../components/FieldIncidentSummary.jsx';
import FieldIncidentTable from '../components/FieldIncidentTable.jsx';
import RangerLayout from '../components/RangerLayout.jsx';
import useFieldIncidentHistory from '../hooks/useFieldIncidentHistory.js';
import { filterFieldIncidents, summarizeFieldIncidents } from '../services/field-incident-history.service.js';
import './my-field-incidents.css';

const DEFAULT_FILTERS = {
  search: '', status: 'ALL', incidentType: 'ALL', riskLevel: 'ALL', sort: 'NEWEST',
};

export default function MyFieldIncidentsPage({ navigate }) {
  const { user } = useAuth();
  const { incidents, isLoading, serverError, offlineWarning, retry } = useFieldIncidentHistory(user.id);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedKey, setSelectedKey] = useState('');
  const closeDetails = useCallback(() => setSelectedKey(''), []);
  const visibleIncidents = filterFieldIncidents(incidents, filters);
  const counts = summarizeFieldIncidents(incidents);
  const selectedIncident = incidents.find((incident) => (
    (incident.clientIncidentId || incident.id) === selectedKey
  ));
  const hasLoadError = Boolean(serverError || offlineWarning);

  return (
    <RangerLayout navigate={navigate} active="folder">
      <section className="report-workspace field-incidents-history">
        <header className="dashboard-welcome field-incidents-header">
          <p>My Incidents</p>
          <h1>My Field Incidents</h1>
          <span>View field incidents you have submitted or saved for synchronization.</span>
        </header>

        <FieldIncidentSummary counts={counts} isLoading={isLoading} />

        {serverError && (
          <div className="field-incidents-alert is-error" role="alert">
            <div>
              <strong>Unable to load your field incidents.</strong>
              <p>{serverError}</p>
            </div>
            <button type="button" className="secondary-button" onClick={retry} disabled={isLoading}>Retry</button>
          </div>
        )}

        {offlineWarning && (
          <div className="field-incidents-alert is-warning" role="status">
            <span>{offlineWarning}</span>
            {!serverError && (
              <button type="button" className="secondary-button" onClick={retry} disabled={isLoading}>Retry</button>
            )}
          </div>
        )}

        <FieldIncidentFilters filters={filters} onChange={setFilters} disabled={isLoading} />

        {isLoading && <p className="field-incidents-loading" role="status">Loading incidents...</p>}

        {visibleIncidents.length > 0 && (
          <FieldIncidentTable
            incidents={visibleIncidents}
            onView={(incident) => setSelectedKey(incident.clientIncidentId || incident.id)}
          />
        )}

        {!isLoading && visibleIncidents.length === 0 && (incidents.length > 0 || !hasLoadError) && (
          <div className="field-incidents-empty" role="status">
            <h2>{incidents.length ? 'No incidents match the selected filters.' : 'No field incidents yet.'}</h2>
            {incidents.length ? (
              <p>Try another search or change the filters.</p>
            ) : (
              <>
                <p>Incidents you report will appear here.</p>
                <button type="button" className="primary-button" onClick={() => navigate('/ranger/incidents/new')}>
                  Report Field Incident
                </button>
              </>
            )}
          </div>
        )}

        {selectedIncident && <FieldIncidentDetailsModal incident={selectedIncident} onClose={closeDetails} />}
      </section>
    </RangerLayout>
  );
}
