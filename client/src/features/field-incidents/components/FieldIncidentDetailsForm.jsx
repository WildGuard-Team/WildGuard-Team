import { fieldIncidentTypeLabel } from '../utils/field-incident-options.js';

export default function FieldIncidentDetailsForm({ draft, errors, onChange, children }) {
  return (
    <div className="field-incident-details-grid">
      <label className="field-incident-field">
        <span>Incident type</span>
        <input value={fieldIncidentTypeLabel(draft.incidentType)} readOnly />
      </label>

      <label className="field-incident-field">
        <span>Date</span>
        <input type="date" name="incidentDate" value={draft.incidentDate} onChange={onChange} />
        {errors.incidentDate && <small>{errors.incidentDate}</small>}
      </label>

      <label className="field-incident-field">
        <span>Time</span>
        <input type="time" name="incidentTime" value={draft.incidentTime} onChange={onChange} />
        {errors.incidentTime && <small>{errors.incidentTime}</small>}
      </label>

      <label className="field-incident-field">
        <span>Risk level</span>
        <select name="riskLevel" value={draft.riskLevel} onChange={onChange}>
          <option value="">Select risk level</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
        {errors.riskLevel && <small>{errors.riskLevel}</small>}
      </label>

      <label className="field-incident-field">
        <span>Park / Zone</span>
        <input
          name="parkZone"
          value={draft.parkZone}
          onChange={onChange}
          placeholder="Example: Yala National Park"
        />
        {errors.parkZone && <small>{errors.parkZone}</small>}
      </label>

      <label className="field-incident-field">
        <span>Block / Area</span>
        <input
          name="blockArea"
          value={draft.blockArea}
          onChange={onChange}
          placeholder="Example: Block 1"
        />
        {errors.blockArea && <small>{errors.blockArea}</small>}
      </label>

      {children}

      <label className="field-incident-field field-incident-wide">
        <span>Incident description</span>
        <textarea
          name="description"
          value={draft.description}
          onChange={onChange}
          placeholder="Describe what you observed during the patrol"
        />
        {errors.description && <small>{errors.description}</small>}
      </label>

      <label className="field-incident-field field-incident-wide">
        <span>Additional notes<em> Optional</em></span>
        <textarea
          name="additionalNotes"
          value={draft.additionalNotes}
          onChange={onChange}
          placeholder="Add any other useful information"
        />
        {errors.additionalNotes && <small>{errors.additionalNotes}</small>}
      </label>
    </div>
  );
}
