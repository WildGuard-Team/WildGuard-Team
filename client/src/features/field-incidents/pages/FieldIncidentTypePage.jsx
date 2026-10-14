import { useState } from 'react';

import FormAlert from '../../auth/components/FormAlert.jsx';
import CommunityIcon from '../../community-reports/components/CommunityIcon.jsx';

import RangerLayout from '../components/RangerLayout.jsx';

import {
  useFieldIncidentDraft,
} from '../context/useFieldIncidentDraft.js';

import {
  fieldIncidentTypes,
} from '../utils/field-incident-options.js';

export default function FieldIncidentTypePage({
  navigate,
}) {
  const {
    draft,
    updateDraft,
    resetDraft,
  } = useFieldIncidentDraft();

  const [error, setError] = useState('');

  function selectType(value) {
    updateDraft({
      incidentType: value,
    });

    setError('');
  }

  function continueToDetails() {
    if (!draft.incidentType) {
      setError(
        'Choose an incident type to continue.',
      );

      return;
    }

    navigate('/ranger/incidents/details');
  }

  function cancel() {
    resetDraft();
    navigate('/ranger');
  }

  return (
    <RangerLayout
      navigate={navigate}
      active="report"
    >
      <section className="report-workspace">
        <div className="report-heading">
          <div>
            <h1>Report Field Incident</h1>

            <p>
              Choose the type of incident you encountered
              during your patrol.
            </p>
          </div>

          <p className="report-step">
            Step 1 of 4
          </p>
        </div>

        <FormAlert>
          {error}
        </FormAlert>

        <div className="field-incident-type-grid">
          {fieldIncidentTypes.map((type) => {
            const selected =
              draft.incidentType === type.value;

            return (
              <button
                key={type.value}
                type="button"
                className={
                  `field-incident-type-card${
                    selected
                      ? ' is-selected'
                      : ''
                  }`
                }
                onClick={() =>
                  selectType(type.value)
                }
                aria-pressed={selected}
              >
                <span className="field-incident-type-icon">
                  <CommunityIcon
                    name={type.icon}
                    size={25}
                  />
                </span>

                <strong>
                  {type.title}
                </strong>

                <small>
                  {type.description}
                </small>

                <span
                  className="field-incident-radio"
                  aria-hidden="true"
                >
                  {selected ? '✓' : ''}
                </span>
              </button>
            );
          })}
        </div>

        <div className="report-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={cancel}
          >
            Cancel
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={continueToDetails}
          >
            Next
            <CommunityIcon
              name="chevron"
              size={20}
            />
          </button>
        </div>
      </section>
    </RangerLayout>
  );
}