import {
    useState,
  } from 'react';
  
  import FormAlert from '../../auth/components/FormAlert.jsx';
  
  import RangerLayout from '../components/RangerLayout.jsx';
  
  import {
    useFieldIncidentDraft,
  } from '../context/useFieldIncidentDraft.js';
  
  import {
    fieldIncidentTypeLabel,
  } from '../utils/field-incident-options.js';
  
  import {
    parseCoordinates,
    validateFieldIncidentDetails,
  } from '../validation/field-incident-details.validation.js';
  
  export default function FieldIncidentDetailsPage({
    navigate,
  }) {
    const {
      draft,
      updateDraft,
      updateLocation,
    } = useFieldIncidentDraft();
  
    const [errors, setErrors] = useState({});
    const [locationMessage, setLocationMessage] =
      useState('');
  
    const [isFindingLocation, setIsFindingLocation] =
      useState(false);
  
    function updateField(event) {
      const {
        name,
        value,
      } = event.target;
  
      updateDraft({
        [name]: value,
      });
  
      setErrors((current) => ({
        ...current,
        [name]: undefined,
      }));
    }
  
    function updateLocationField(event) {
      const {
        name,
        value,
      } = event.target;
  
      updateLocation({
        [name]: value,
      });
  
      setErrors((current) => ({
        ...current,
        location: undefined,
      }));
  
      setLocationMessage('');
    }
  
    function useCurrentLocation() {
      setLocationMessage('');
  
      if (!navigator.geolocation) {
        setLocationMessage(
          'GPS location is not supported by this browser. Enter the coordinates or location description manually.',
        );
  
        return;
      }
  
      setIsFindingLocation(true);
  
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latitude =
            position.coords.latitude;
  
          const longitude =
            position.coords.longitude;
  
          updateLocation({
            source: 'GPS',
  
            coordinates: {
              latitude,
              longitude,
            },
  
            manualCoordinates:
              `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          });
  
          setErrors((current) => ({
            ...current,
            location: undefined,
          }));
  
          setLocationMessage(
            'Current GPS location captured successfully.',
          );
  
          setIsFindingLocation(false);
        },
  
        () => {
          setLocationMessage(
            'Unable to get your current GPS location. You can retry or enter the location manually.',
          );
  
          setIsFindingLocation(false);
        },
  
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      );
    }
  
    function continueToEvidence() {
      const manualCoordinates =
        parseCoordinates(
          draft.location.manualCoordinates,
        );
  
      const nextDraft = {
        ...draft,
  
        location: {
          ...draft.location,
  
          coordinates:
            draft.location.coordinates
            ?? manualCoordinates,
        },
      };
  
      const nextErrors =
        validateFieldIncidentDetails(
          nextDraft,
        );
  
      setErrors(nextErrors);
  
      if (
        Object.keys(nextErrors).length
      ) {
        return;
      }
  
      if (
        !draft.location.coordinates
        && manualCoordinates
      ) {
        updateLocation({
          source: 'MANUAL',
  
          coordinates:
            manualCoordinates,
        });
      }
  
      navigate(
        '/ranger/incidents/evidence',
      );
    }
  
    return (
      <RangerLayout
        navigate={navigate}
        active="report"
      >
        <section className="report-workspace">
          <div className="report-heading">
            <div>
              <h1>
                Report Field Incident
              </h1>
  
              <p>
                Provide accurate information
                about the incident.
              </p>
            </div>
  
            <p className="report-step">
              Step 2 of 4
            </p>
          </div>
  
          <div className="field-incident-details-card">
            <div className="field-incident-details-grid">
  
              <label className="field-incident-field">
                <span>
                  Incident type
                </span>
  
                <input
                  value={
                    fieldIncidentTypeLabel(
                      draft.incidentType,
                    )
                  }
                  readOnly
                />
              </label>
  
              <label className="field-incident-field">
                <span>
                  Date
                </span>
  
                <input
                  type="date"
                  name="incidentDate"
                  value={draft.incidentDate}
                  onChange={updateField}
                />
  
                {errors.incidentDate && (
                  <small>
                    {errors.incidentDate}
                  </small>
                )}
              </label>
  
              <label className="field-incident-field">
                <span>
                  Time
                </span>
  
                <input
                  type="time"
                  name="incidentTime"
                  value={draft.incidentTime}
                  onChange={updateField}
                />
  
                {errors.incidentTime && (
                  <small>
                    {errors.incidentTime}
                  </small>
                )}
              </label>
  
              <label className="field-incident-field">
                <span>
                  Risk level
                </span>
  
                <select
                  name="riskLevel"
                  value={draft.riskLevel}
                  onChange={updateField}
                >
                  <option value="">
                    Select risk level
                  </option>
  
                  <option value="LOW">
                    Low
                  </option>
  
                  <option value="MEDIUM">
                    Medium
                  </option>
  
                  <option value="HIGH">
                    High
                  </option>
                </select>
  
                {errors.riskLevel && (
                  <small>
                    {errors.riskLevel}
                  </small>
                )}
              </label>
  
              <label className="field-incident-field">
                <span>
                  Park / Zone
                </span>
  
                <input
                  name="parkZone"
                  value={draft.parkZone}
                  onChange={updateField}
                  placeholder="Example: Yala National Park"
                />
  
                {errors.parkZone && (
                  <small>
                    {errors.parkZone}
                  </small>
                )}
              </label>
  
              <label className="field-incident-field">
                <span>
                  Block / Area
                </span>
  
                <input
                  name="blockArea"
                  value={draft.blockArea}
                  onChange={updateField}
                  placeholder="Example: Block 1"
                />
  
                {errors.blockArea && (
                  <small>
                    {errors.blockArea}
                  </small>
                )}
              </label>
  
              <div className="field-incident-location-field">
                <label>
                  <span>
                    GPS Location (optional)
                  </span>
  
                  <div className="field-incident-gps-row">
                    <input
                      name="manualCoordinates"
                      value={
                        draft.location
                          .manualCoordinates
                      }
                      onChange={
                        updateLocationField
                      }
                      placeholder="Latitude, Longitude"
                    />
  
                    <button
                      type="button"
                      onClick={
                        useCurrentLocation
                      }
                      disabled={
                        isFindingLocation
                      }
                    >
                      {isFindingLocation
                        ? 'Finding...'
                        : 'Use My Location'}
                    </button>
                  </div>
                </label>
  
                {locationMessage && (
                  <p className="field-location-message">
                    {locationMessage}
                  </p>
                )}
  
                {errors.location && (
                  <small className="field-incident-error">
                    {errors.location}
                  </small>
                )}
              </div>
  
              <label className="field-incident-field field-incident-wide">
                <span>
                  Location description
                </span>
  
                <textarea
                  name="description"
                  value={
                    draft.location.description
                  }
                  onChange={
                    updateLocationField
                  }
                  placeholder="Describe where the incident occurred"
                />
              </label>
  
              <label className="field-incident-field field-incident-wide">
                <span>
                  Incident description
                </span>
  
                <textarea
                  name="description"
                  value={draft.description}
                  onChange={updateField}
                  placeholder="Describe what you observed during the patrol"
                />
  
                {errors.description && (
                  <small>
                    {errors.description}
                  </small>
                )}
              </label>
  
              <label className="field-incident-field field-incident-wide">
                <span>
                  Additional notes
                  <em> Optional</em>
                </span>
  
                <textarea
                  name="additionalNotes"
                  value={
                    draft.additionalNotes
                  }
                  onChange={updateField}
                  placeholder="Add any other useful information"
                />
  
                {errors.additionalNotes && (
                  <small>
                    {errors.additionalNotes}
                  </small>
                )}
              </label>
  
            </div>
  
            <div className="field-incident-details-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  navigate(
                    '/ranger/incidents/new',
                  )
                }
              >
                Back
              </button>
  
              <button
                type="button"
                className="primary-button"
                onClick={
                  continueToEvidence
                }
              >
                Next →
              </button>
            </div>
          </div>
        </section>
      </RangerLayout>
    );
  }