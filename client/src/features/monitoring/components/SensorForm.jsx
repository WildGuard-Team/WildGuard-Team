import { SENSOR_STATUSES, SENSOR_TYPES } from "../utils/sensorForm.js";

function FormField({ label, children }) {
  return (
    <label className="monitoring-form-field">
      <span>{label}</span>

      {children}
    </label>
  );
}

export default function SensorForm({
  form,
  editing,
  submitting,
  onChange,
  onSubmit,
  onCancel,
}) {
  return (
    <form className="sensor-form" onSubmit={onSubmit}>
      <FormField label="Sensor ID">
        <input
          name="sensorId"
          value={form.sensorId}
          onChange={onChange}
          placeholder="GPS-001"
          required
        />
      </FormField>

      <FormField label="Sensor Name">
        <input
          name="name"
          value={form.name}
          onChange={onChange}
          placeholder="Elephant GPS Collar"
          required
        />
      </FormField>

      <FormField label="Sensor Type">
        <select name="type" value={form.type} onChange={onChange}>
          {SENSOR_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Status">
        <select name="status" value={form.status} onChange={onChange}>
          {SENSOR_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Animal ID">
        <input
          name="animalId"
          value={form.animalId}
          onChange={onChange}
          placeholder="Optional"
        />
      </FormField>

      <FormField label="Expected Interval (minutes)">
        <input
          type="number"
          min="1"
          name="expectedIntervalMinutes"
          value={form.expectedIntervalMinutes}
          onChange={onChange}
          required
        />
      </FormField>

      <FormField label="Latitude">
        <input
          type="number"
          step="any"
          min="-90"
          max="90"
          name="latitude"
          value={form.latitude}
          onChange={onChange}
          placeholder="7.2906"
          required
        />
      </FormField>

      <FormField label="Longitude">
        <input
          type="number"
          step="any"
          min="-180"
          max="180"
          name="longitude"
          value={form.longitude}
          onChange={onChange}
          placeholder="80.6337"
          required
        />
      </FormField>

      <div className="sensor-form-actions">
        <button
          className="monitoring-primary-button"
          type="submit"
          disabled={submitting}
        >
          {submitting ? "Saving..." : editing ? "Update Sensor" : "Add Sensor"}
        </button>

        {editing && (
          <button
            className="monitoring-secondary-button"
            type="button"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
