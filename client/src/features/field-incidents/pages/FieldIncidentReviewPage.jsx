import {
    useRef,
    useState,
  } from 'react';
  
  import FormAlert
    from '../../auth/components/FormAlert.jsx';
  
  import EvidencePreviewCard
    from '../../community-reports/components/EvidencePreviewCard.jsx';
  
  import RangerLayout
    from '../components/RangerLayout.jsx';
  
  import {
    useFieldIncidentDraft,
  } from '../context/useFieldIncidentDraft.js';
  
  import {
    fieldIncidentTypeLabel,
  } from '../utils/field-incident-options.js';
  
  import {
    submitFieldIncident,
  } from '../services/field-incident.service.js';
  
  function formatRiskLevel(value) {
    if (!value) {
      return 'Not provided';
    }
  
    return (
      value.charAt(0)
      + value
        .slice(1)
        .toLowerCase()
    );
  }
  
  function formatCoordinates(
    coordinates,
  ) {
    if (!coordinates) {
      return 'Not provided';
    }
  
    return (
      `${coordinates.latitude.toFixed(6)}, `
      + `${coordinates.longitude.toFixed(6)}`
    );
  }
  
  export default function FieldIncidentReviewPage({
    navigate,
  }) {
    const {
      draft,
      setSubmittedIncident,
      clearDraft,
    } = useFieldIncidentDraft();
  
    const [error, setError] =
      useState('');
  
    const [
      isSubmitting,
      setIsSubmitting,
    ] = useState(false);
  
    const submissionLock =
      useRef(false);
  
    async function submit() {
      if (
        submissionLock.current
      ) {
        return;
      }
  
      submissionLock.current =
        true;
  
      setIsSubmitting(true);
      setError('');
  
      try {
        const incident =
          await submitFieldIncident(
            draft,
          );
  
        setSubmittedIncident(
          incident,
        );
  
        clearDraft();
  
        navigate(
          '/ranger/incidents/confirmation',
        );
      } catch (requestError) {
        setError(
          requestError.message,
        );
      } finally {
        submissionLock.current =
          false;
  
        setIsSubmitting(false);
      }
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
                Review the incident information
                before submitting the report.
              </p>
            </div>
  
            <p className="report-step">
              Step 4 of 4
            </p>
          </div>
  
          <FormAlert>
            {error}
          </FormAlert>
  
          <div className="review-list review-grid">
            <section>
              <div>
                <h2>
                  Incident Type
                </h2>
  
                <p>
                  {fieldIncidentTypeLabel(
                    draft.incidentType,
                  )}
                </p>
              </div>
  
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() =>
                  navigate(
                    '/ranger/incidents/new',
                  )
                }
              >
                Edit
              </button>
            </section>
  
            <section>
              <div>
                <h2>
                  Date & Time
                </h2>
  
                <p>
                  {draft.incidentDate}
                  {' at '}
                  {draft.incidentTime}
                </p>
              </div>
  
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() =>
                  navigate(
                    '/ranger/incidents/details',
                  )
                }
              >
                Edit
              </button>
            </section>
  
            <section>
              <div>
                <h2>
                  Risk Level
                </h2>
  
                <p>
                  {formatRiskLevel(
                    draft.riskLevel,
                  )}
                </p>
              </div>
  
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() =>
                  navigate(
                    '/ranger/incidents/details',
                  )
                }
              >
                Edit
              </button>
            </section>
  
            <section>
              <div>
                <h2>
                  Park / Area
                </h2>
  
                <p>
                  {draft.parkZone}
  
                  {draft.blockArea
                    ? ` – ${draft.blockArea}`
                    : ''}
                </p>
              </div>
  
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() =>
                  navigate(
                    '/ranger/incidents/details',
                  )
                }
              >
                Edit
              </button>
            </section>
  
            <section>
              <div>
                <h2>
                  GPS Location
                </h2>
  
                <p>
                  {formatCoordinates(
                    draft.location
                      .coordinates,
                  )}
                </p>
  
                {draft.location
                  .description && (
                  <p>
                    {
                      draft.location
                        .description
                    }
                  </p>
                )}
              </div>
  
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() =>
                  navigate(
                    '/ranger/incidents/details',
                  )
                }
              >
                Edit
              </button>
            </section>
  
            <section>
              <div>
                <h2>
                  Incident Description
                </h2>
  
                <p>
                  {draft.description}
                </p>
              </div>
  
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() =>
                  navigate(
                    '/ranger/incidents/details',
                  )
                }
              >
                Edit
              </button>
            </section>
  
            {draft.additionalNotes && (
              <section>
                <div>
                  <h2>
                    Additional Notes
                  </h2>
  
                  <p>
                    {draft.additionalNotes}
                  </p>
                </div>
  
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() =>
                    navigate(
                      '/ranger/incidents/details',
                    )
                  }
                >
                  Edit
                </button>
              </section>
            )}
  
            <section className="review-evidence">
              <div>
                <h2>
                  Evidence
                </h2>
  
                {draft.evidence.length
                  === 0 ? (
                    <p>
                      No evidence attached.
                    </p>
                  ) : (
                    <div className="review-evidence-grid">
                      {draft.evidence.map(
                        (file) => (
                          <EvidencePreviewCard
                            key={
                              `${file.name}-${file.size}-${file.lastModified}`
                            }
                            file={file}
                            compact
                          />
                        ),
                      )}
                    </div>
                  )}
              </div>
  
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() =>
                  navigate(
                    '/ranger/incidents/evidence',
                  )
                }
              >
                Edit
              </button>
            </section>
          </div>
  
          <div className="report-actions">
            <button
              type="button"
              className="secondary-button"
              disabled={isSubmitting}
              onClick={() =>
                navigate(
                  '/ranger/incidents/evidence',
                )
              }
            >
              Back
            </button>
  
            <button
              type="button"
              className="primary-button"
              disabled={isSubmitting}
              onClick={submit}
            >
              {isSubmitting
                ? 'Submitting...'
                : 'Submit Report'}
            </button>
          </div>
        </section>
      </RangerLayout>
    );
  }