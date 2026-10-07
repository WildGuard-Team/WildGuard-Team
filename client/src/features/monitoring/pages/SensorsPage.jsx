import { useCallback, useEffect, useState } from "react";

import SensorForm from "../components/SensorForm.jsx";

import { monitoringApi } from "../services/monitoringApi.js";

import {
  createEmptySensorForm,
  formToSensorPayload,
  formatDateTime,
  formatLocation,
  formatSensorType,
  sensorToForm,
} from "../utils/sensorForm.js";

export default function SensorsPage() {
  const [sensors, setSensors] = useState([]);

  const [form, setForm] = useState(createEmptySensorForm);

  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const loadSensors = useCallback(async () => {
    setLoading(true);

    try {
      const data = await monitoringApi.getSensors();

      setSensors(data);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSensors();
  }, [loadSensors]);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function resetEditor() {
    setEditingId(null);

    setForm(createEmptySensorForm());
  }

  function handleFieldChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleEdit(sensor) {
    clearMessages();

    setEditingId(sensor._id);

    setForm(sensorToForm(sensor));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveSensor() {
    const payload = formToSensorPayload(form);

    if (editingId) {
      await monitoringApi.updateSensor(editingId, payload);

      return "Sensor updated successfully.";
    }

    await monitoringApi.createSensor(payload);

    return "Sensor added successfully.";
  }

  async function handleSubmit(event) {
    event.preventDefault();

    clearMessages();
    setSubmitting(true);

    try {
      const message = await saveSensor();

      resetEditor();

      await loadSensors();

      setSuccess(message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(sensor) {
    const confirmed = window.confirm(`Delete sensor ${sensor.sensorId}?`);

    if (!confirmed) {
      return;
    }

    clearMessages();

    try {
      await monitoringApi.deleteSensor(sensor._id);

      if (editingId === sensor._id) {
        resetEditor();
      }

      await loadSensors();

      setSuccess("Sensor deleted successfully.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section className="sensor-page">
      <article className="sensor-form-card">
        <div className="monitoring-section-heading">
          <div>
            <h2>{editingId ? "Update Sensor" : "Add Sensor"}</h2>

            <p>Register GPS collars, camera traps sensors.</p>
          </div>
        </div>

        {error && <div className="monitoring-error">{error}</div>}

        {success && <div className="monitoring-success">{success}</div>}

        <SensorForm
          form={form}
          editing={Boolean(editingId)}
          submitting={submitting}
          onChange={handleFieldChange}
          onSubmit={handleSubmit}
          onCancel={resetEditor}
        />
      </article>

      <article className="sensor-table-card">
        <div className="monitoring-section-heading">
          <div>
            <h2>Registered Sensors</h2>

            <p>Manage all monitoring devices from one page.</p>
          </div>

          <span className="monitoring-count">{sensors.length} Sensors</span>
        </div>

        {loading ? (
          <div className="monitoring-loading">Loading sensors...</div>
        ) : (
          <SensorTable
            sensors={sensors}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </article>
    </section>
  );
}

function SensorTable({ sensors, onEdit, onDelete }) {
  if (sensors.length === 0) {
    return <div className="monitoring-empty">No sensors registered yet.</div>;
  }

  return (
    <div className="monitoring-table-wrapper">
      <table className="monitoring-table">
        <thead>
          <tr>
            <th>Sensor ID</th>
            <th>Name</th>
            <th>Type</th>
            <th>Status</th>
            <th>Animal</th>
            <th>Location</th>
            <th>Last Seen</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {sensors.map((sensor) => (
            <SensorRow
              key={sensor._id}
              sensor={sensor}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SensorRow({ sensor, onEdit, onDelete }) {
  return (
    <tr>
      <td>
        <strong>{sensor.sensorId}</strong>
      </td>

      <td>{sensor.name}</td>

      <td>{formatSensorType(sensor.type)}</td>

      <td>
        <span
          className={`sensor-status sensor-status-${sensor.status?.toLowerCase()}`}
        >
          {sensor.status}
        </span>
      </td>

      <td>{sensor.animalId || "—"}</td>

      <td>{formatLocation(sensor.location)}</td>

      <td>{formatDateTime(sensor.lastSeenAt)}</td>

      <td>
        <div className="sensor-row-actions">
          <button
            type="button"
            className="table-edit-button"
            onClick={() => onEdit(sensor)}
          >
            Edit
          </button>

          <button
            type="button"
            className="table-delete-button"
            onClick={() => onDelete(sensor)}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
