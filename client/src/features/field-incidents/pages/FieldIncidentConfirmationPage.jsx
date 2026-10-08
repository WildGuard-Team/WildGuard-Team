import RangerLayout
  from '../components/RangerLayout.jsx';

import {
  useFieldIncidentDraft,
} from '../context/useFieldIncidentDraft.js';

export default function FieldIncidentConfirmationPage({
  navigate,
}) {
  const {
    submittedIncident,
    resetDraft,
  } = useFieldIncidentDraft();

  if (!submittedIncident) {
    navigate(
      '/ranger',
      {
        replace: true,
      },
    );

    return null;
  }

  function reportAnother() {
    resetDraft();

    navigate(
      '/ranger/incidents/new',
    );
  }

  function backToDashboard() {
    resetDraft();

    navigate(
      '/ranger',
    );
  }

  return (
    <RangerLayout
      navigate={navigate}
      active="report"
    >
      <section className="report-workspace">
        <div className="field-incident-confirmation">
          <div
            className="field-incident-confirmation-icon"
            aria-hidden="true"
          >
            ✓
          </div>

          <h1>
            Incident Report Submitted
          </h1>

          <p>
            The field incident has been
            recorded successfully.
          </p>

          <div className="field-incident-reference">
            <span>
              Incident Reference Number
            </span>

            <strong>
              {
                submittedIncident
                  .referenceNumber
              }
            </strong>

            <small>
              Keep this reference number
              for your records.
            </small>
          </div>

          <div className="report-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={
                backToDashboard
              }
            >
              Back to Dashboard
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={
                reportAnother
              }
            >
              Report Another Incident
            </button>
          </div>
        </div>
      </section>
    </RangerLayout>
  );
}