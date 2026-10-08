import { useState } from 'react';

import FieldIncidentDetailsForm from '../components/FieldIncidentDetailsForm.jsx';
import FieldIncidentLocationFields from '../components/FieldIncidentLocationFields.jsx';
import RangerLayout from '../components/RangerLayout.jsx';
import { useFieldIncidentDraft } from '../context/useFieldIncidentDraft.js';
import { reconcileFieldIncidentLocation } from '../utils/field-incident-location.js';
import { validateFieldIncidentDetails } from '../validation/field-incident-details.validation.js';

export default function FieldIncidentDetailsPage({ navigate }) {
  const { draft, updateDraft, updateLocation } = useFieldIncidentDraft();
  const [errors, setErrors] = useState({});

  function updateField(event) {
    const { name, value } = event.target;
    updateDraft({ [name]: value });
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  function changeLocation(changes) {
    updateLocation(changes);
    setErrors((current) => ({ ...current, location: undefined }));
  }

  function continueToEvidence() {
    const nextLocation = reconcileFieldIncidentLocation(draft.location);
    const nextErrors = validateFieldIncidentDetails({ ...draft, location: nextLocation });
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) return;

    updateLocation(nextLocation);
    navigate('/ranger/incidents/evidence');
  }

  return (
    <RangerLayout navigate={navigate} active="report">
      <section className="report-workspace">
        <div className="report-heading">
          <div>
            <h1>Report Field Incident</h1>
            <p>Provide accurate information about the incident.</p>
          </div>
          <p className="report-step">Step 2 of 4</p>
        </div>

        <div className="field-incident-details-card">
          <FieldIncidentDetailsForm draft={draft} errors={errors} onChange={updateField}>
            <FieldIncidentLocationFields
              location={draft.location}
              error={errors.location}
              onChange={changeLocation}
            />
          </FieldIncidentDetailsForm>

          <div className="field-incident-details-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate('/ranger/incidents/new')}
            >
              Back
            </button>
            <button type="button" className="primary-button" onClick={continueToEvidence}>
              Next →
            </button>
          </div>
        </div>
      </section>
    </RangerLayout>
  );
}
