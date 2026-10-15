export default function IncidentDetailsForm({ description, error, onChange, incidentDateTime, dateError, onDateChange }) {
  const count = description.length;
  return <section className="incident-description" aria-labelledby="incident-description-title">
    <h2 id="incident-description-title">Incident Description</h2>
    <p>Please provide as much detail as possible about what you observed.</p>
    <label className="sr-only" htmlFor="description">Describe what you observed</label>
    <textarea id="description" name="description" value={description} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby="description-status" placeholder="Describe what you observed..." maxLength={2000} />
    <p id="description-status" className={error ? 'details-field-status is-error' : 'details-field-status'} aria-live="polite">{error || `${count} / 2000`}</p>
    <div className="incident-date-time form-field">
      <label htmlFor="incident-date-time">Incident Date &amp; Time</label>
      <input id="incident-date-time" name="incidentDateTime" type="datetime-local" step="60" required value={incidentDateTime ?? ''} onChange={(event) => onDateChange(event.target.value)} aria-invalid={Boolean(dateError)} aria-describedby="incident-date-time-status" />
      <span id="incident-date-time-status" className={dateError ? 'field-error' : 'field-hint'} aria-live="polite">{dateError || 'When did you observe the incident? Use your local date and time.'}</span>
    </div>
  </section>;
}
