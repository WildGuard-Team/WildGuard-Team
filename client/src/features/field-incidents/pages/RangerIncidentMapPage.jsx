import { useCallback, useState } from 'react';
import { useAuth } from '../../../context/useAuth.js';
import CommunityIcon from '../../community-reports/components/CommunityIcon.jsx';
import FieldIncidentDetailsModal from '../components/FieldIncidentDetailsModal.jsx';
import IncidentMapFilters from '../components/IncidentMapFilters.jsx';
import IncidentMapSummary from '../components/IncidentMapSummary.jsx';
import RangerIncidentMap from '../components/RangerIncidentMap.jsx';
import RangerLayout from '../components/RangerLayout.jsx';
import useFieldIncidentHistory from '../hooks/useFieldIncidentHistory.js';
import { filterIncidentMap, incidentMapKey, summarizeIncidentMap } from '../utils/field-incident-map.js';
import './ranger-incident-map-page.css';

const defaultFilters = { incidentType: 'ALL', riskLevel: 'ALL', status: 'ALL', search: '' };

export default function RangerIncidentMapPage({ navigate }) {
  const { user } = useAuth();
  const { incidents, isLoading, serverError, offlineWarning, retry } = useFieldIncidentHistory(user.id);
  const [filters, setFilters] = useState(defaultFilters);
  const [selectedKey, setSelectedKey] = useState('');
  const closeDetails = useCallback(() => setSelectedKey(''), []);
  const counts = summarizeIncidentMap(incidents);
  const visibleIncidents = filterIncidentMap(incidents, filters);
  const hasActiveFilters = filters.incidentType !== 'ALL' || filters.riskLevel !== 'ALL'
    || filters.status !== 'ALL' || Boolean(filters.search.trim());
  const hasLoadError = Boolean(serverError || offlineWarning);
  const selectedIncident = incidents.find((incident) => incidentMapKey(incident) === selectedKey);

  return (
    <RangerLayout navigate={navigate} active="map">
      <section className="ranger-incident-map-page" aria-labelledby="ranger-map-title">
        <header className="ranger-map-heading">
          <div>
            <p className="ranger-map-kicker">Park Ranger Map</p>
            <h1 id="ranger-map-title">Incident Map</h1>
            <p className="ranger-map-subtitle">View the locations of your reported field incidents.</p>
          </div>
          <button type="button" className="primary-button"
            onClick={() => navigate('/ranger/incidents/new')}>
            <CommunityIcon name="plus" size={18} /> Report Field Incident
          </button>
        </header>

        <IncidentMapSummary counts={counts} isLoading={isLoading}
          serverUnavailable={Boolean(serverError)} pendingUnavailable={Boolean(offlineWarning)} />

        {hasLoadError && (
          <div className="ranger-map-notice is-warning" role="alert">
            <div>
              <strong>Some incident locations could not be loaded.</strong>
              {serverError && <p>{serverError}</p>}
              {offlineWarning && <p>{offlineWarning}</p>}
              <p>Available incident locations are still shown on the map.</p>
            </div>
            <button type="button" className="secondary-button" disabled={isLoading} onClick={retry}>Retry</button>
          </div>
        )}

        <div className="ranger-map-workspace">
          <IncidentMapFilters filters={filters} onChange={setFilters} disabled={isLoading}
            onClear={() => setFilters(defaultFilters)} hasActiveFilters={hasActiveFilters} />
          <div className="ranger-map-results" role="status">
            {isLoading ? 'Loading incident locations…' : hasLoadError
              ? `Showing ${visibleIncidents.length} available incident locations`
              : `Showing ${visibleIncidents.length} of ${counts.mapped} mapped incidents`}
          </div>
          <RangerIncidentMap key={user.id} incidents={visibleIncidents} isLoading={isLoading}
            hasLoadError={hasLoadError} hasActiveFilters={hasActiveFilters}
            onViewIncident={(incident) => setSelectedKey(incidentMapKey(incident))}
            onReport={() => navigate('/ranger/incidents/new')} />
        </div>

        {!isLoading && counts.withoutGps > 0 && (
          <p className="ranger-map-gps-note">
            <CommunityIcon name="pin" size={18} />
            <span>{counts.withoutGps} {counts.withoutGps === 1 ? 'incident does' : 'incidents do'} not contain valid GPS coordinates and {counts.withoutGps === 1 ? 'is' : 'are'} not shown on the map.</span>
          </p>
        )}
        {selectedIncident && <FieldIncidentDetailsModal key={`${user.id}:${selectedKey}`}
          incident={selectedIncident} onClose={closeDetails} />}
      </section>
    </RangerLayout>
  );
}
