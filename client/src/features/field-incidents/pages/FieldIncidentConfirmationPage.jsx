import { useEffect } from 'react';
import { FIELD_INCIDENT_PENDING_SYNC } from '../config/field-incident.constants.js';

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

  useEffect(() => {
    if (!submittedIncident) {
      navigate('/ranger', { replace: true });
    }
  }, [navigate, submittedIncident]);

  if (!submittedIncident) {
    return null;
  }

  const isPendingSync =
    submittedIncident.status
    === FIELD_INCIDENT_PENDING_SYNC;

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
            {isPendingSync
              ? '↻'
              : '✓'}
          </div>

          <h1>
            {isPendingSync
              ? 'Incident Saved Offline'
              : 'Incident Report Submitted'}
          </h1>

          <p>
            {isPendingSync
              ? (
                <>
                  No network connection was available.
                  The incident has been saved safely
                  and is pending synchronization.
                </>
              )
              : (
                <>
                  The field incident has been
                  recorded successfully.
                </>
              )}
          </p>

          <div className="field-incident-reference">
            {isPendingSync ? (
              <>
                <span>
                  Synchronization Status
                </span>

                <strong>
                  Pending Synchronization
                </strong>

                <small>
                  WildGuard will retry this
                  incident when a network
                  connection becomes available.
                </small>
              </>
            ) : (
              <>
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
              </>
            )}
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
