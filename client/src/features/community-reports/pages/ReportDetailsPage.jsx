import { useEffect, useRef, useState } from 'react';
import ReportLayout from '../components/ReportLayout.jsx';
import IncidentDetailsForm from '../components/IncidentDetailsForm.jsx';
import LocationMap from '../components/LocationMap.jsx';
import LocationSearch from '../components/LocationSearch.jsx';
import SelectedLocation from '../components/SelectedLocation.jsx';
import { useReportDraft } from '../context/useReportDraft.js';
import { useCurrentLocation } from '../hooks/useCurrentLocation.js';
import { reverseGeocode } from '../services/locationApi.js';
import { validateReportDetails } from '../validation/reportDetails.validation.js';

export default function ReportDetailsPage({ navigate }) {
  const { draft, updateDraft, updateLocation } = useReportDraft();
  const [errors, setErrors] = useState({});
  const [lookupWarning, setLookupWarning] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const lookupId = useRef(0);
  const isMounted = useRef(true);
  const { requestCurrentLocation, isLocating, locationError } = useCurrentLocation();

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  function saveLocation(changes) {
    updateLocation(changes);
    setErrors((current) => ({ ...current, location: '', manualLocation: '' }));
  }

  function coordinatesMatch(first, second) {
    return first?.latitude === second?.latitude && first?.longitude === second?.longitude;
  }

  async function resolveCoordinates(coordinates, source) {
    const requestId = ++lookupId.current;
    const selectedCoordinates = { latitude: coordinates.latitude, longitude: coordinates.longitude };
    const selectedLocation = {
      source,
      coordinates: selectedCoordinates,
      displayName: '',
      manualLocation: source === 'MANUAL' ? draft.location.manualLocation : '',
    };
    saveLocation(selectedLocation);
    setLookupWarning(''); setIsResolving(true);
    try {
      const result = await reverseGeocode(coordinates);
      if (isMounted.current && requestId === lookupId.current && result) {
        saveLocation((currentLocation) => (
          coordinatesMatch(currentLocation.coordinates, selectedCoordinates)
            ? { displayName: result.displayName }
            : null
        ));
      }
      if (isMounted.current && requestId === lookupId.current && !result) setLookupWarning('Coordinates were selected, but no readable address was found.');
    } catch (requestError) {
      if (isMounted.current && requestId === lookupId.current) setLookupWarning(`${requestError.message} Your selected coordinates will be kept.`);
    } finally {
      if (isMounted.current && requestId === lookupId.current) setIsResolving(false);
    }
  }

  async function handleUseCurrentLocation() {
    if (isLocating || isResolving) return;
    try {
      const coordinates = await requestCurrentLocation();
      if (coordinates) await resolveCoordinates(coordinates, 'GPS');
    } catch {
      if (isMounted.current) setLookupWarning('Unable to get your current location. Select a point on the map or search manually.');
    }
  }

  function selectManualResult(result, manualLocation) {
    lookupId.current += 1;
    saveLocation({
      source: 'MANUAL',
      coordinates: { latitude: result.coordinates.latitude, longitude: result.coordinates.longitude },
      displayName: result.displayName,
      manualLocation,
    });
    setLookupWarning(''); setIsResolving(false);
  }

  function continueToEvidence(event) {
    event.preventDefault();
    const nextErrors = validateReportDetails(draft);
    if (isResolving) nextErrors.location = 'Please wait for the current location lookup to finish.';
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) navigate('/reports/evidence');
  }

  return <ReportLayout navigate={navigate} title="Incident Details & Location" subtitle="Describe what you observed and confirm where it happened." step={2}>
    <form className="incident-details-panel" noValidate onSubmit={continueToEvidence}>
      <IncidentDetailsForm description={draft.description} error={errors.description} onChange={(description) => { updateDraft({ description }); setErrors((current) => ({ ...current, description: '' })); }} />
      <section className="incident-location" aria-labelledby="location-title">
        <h2 id="location-title">Location</h2><p>Select the exact location where the incident occurred on the map.</p>
        <LocationMap coordinates={draft.location.coordinates} onMapSelect={(coordinates) => resolveCoordinates(coordinates, 'MAP')} onMarkerDrag={(coordinates) => resolveCoordinates(coordinates, draft.location.source === 'MANUAL' ? 'MANUAL' : 'MAP')} />
        <button className="current-location-button" type="button" onClick={handleUseCurrentLocation} disabled={isLocating || isResolving}>{isLocating ? 'Locating…' : '⌖ Use My Current Location'}</button>
        <div className="location-message" aria-live="polite">{locationError}</div>
        <SelectedLocation location={draft.location} error={errors.location} warning={lookupWarning} />
        <LocationSearch value={draft.location.manualLocation} onChange={(manualLocation) => saveLocation({ manualLocation })} onSelect={selectManualResult} />
        {errors.manualLocation && <p className="details-field-status is-error" role="alert">{errors.manualLocation}</p>}
      </section>
      <div className="incident-details-actions"><button type="button" className="secondary-button" onClick={() => navigate('/reports/type')}>Back</button><button className="primary-button" type="submit" disabled={isResolving}>{isResolving ? 'Confirming location…' : 'Continue'}</button></div>
    </form>
  </ReportLayout>;
}
