import { useCallback, useEffect, useMemo, useState } from "react";

import SimulationResult from "../components/SimulationResult.jsx";

import { monitoringApi } from "../services/monitoringApi.js";

import { formatSensorType } from "../utils/sensorForm.js";

function createForm() {
  return {
    sensorId: "",
    latitude: "",
    longitude: "",

    batteryLevel: "100",

    detection: "NONE",
    confidence: "0",
  };
}

function getActiveSensors(sensors) {
  return sensors.filter((sensor) => sensor.status === "ACTIVE");
}

function buildValues(sensor, form) {
  const builders = {
    GPS_COLLAR: () => ({
      batteryLevel: Number(form.batteryLevel),
    }),

    CAMERA_TRAP: () => ({
      detection: form.detection,

      confidence: Number(form.confidence),
    }),
  };

  return builders[sensor.type]?.() ?? {};
}

function createPayload(sensor, form) {
  return {
    sensorId: sensor.sensorId,

    timestamp: new Date().toISOString(),

    location: {
      latitude: Number(form.latitude),

      longitude: Number(form.longitude),
    },

    values: buildValues(sensor, form),
  };
}

export default function SimulateReadingPage() {
  const [sensors, setSensors] = useState([]);

  const [zones, setZones] = useState([]);

  const [form, setForm] = useState(createForm);

  const [result, setResult] = useState(null);

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const selectedSensor = useMemo(
    () => sensors.find((sensor) => sensor.sensorId === form.sensorId) ?? null,

    [sensors, form.sensorId],
  );

  const applySensor = useCallback((sensor) => {
    setForm((current) => ({
      ...current,

      sensorId: sensor.sensorId,

      latitude: String(sensor.location?.latitude ?? ""),

      longitude: String(sensor.location?.longitude ?? ""),
    }));
  }, []);

  const loadInitialData = useCallback(async () => {
    setLoading(true);

    try {
      const [sensorData, zoneData] = await Promise.all([
        monitoringApi.getSensors(),
        monitoringApi.getRiskZones(),
      ]);

      const active = getActiveSensors(sensorData);

      setSensors(active);
      setZones(zoneData);

      if (active.length > 0) {
        applySensor(active[0]);
      }

      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [applySensor]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function changeSensor(event) {
    const sensor = sensors.find((item) => item.sensorId === event.target.value);

    if (!sensor) {
      return;
    }

    setResult(null);

    applySensor(sensor);
  }

  async function submit(event) {
    event.preventDefault();

    if (!selectedSensor) {
      setError("Please select an active sensor.");

      return;
    }

    setSubmitting(true);
    setResult(null);
    setError("");

    try {
      const response = await monitoringApi.simulateReading(
        createPayload(selectedSensor, form),
      );

      setResult(response);

      const sensorData = await monitoringApi.getSensors();

      const active = getActiveSensors(sensorData);

      setSensors(active);

      const updated = active.find(
        (sensor) => sensor.sensorId === selectedSensor.sensorId,
      );

      if (updated) {
        applySensor(updated);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="monitoring-loading">
        Loading monitoring configuration...
      </div>
    );
  }

  return (
    <section className="simulate-page">
      <article className="simulate-form-card">
        <div className="monitoring-section-heading">
          <div>
            <h2>Simulate Sensor Reading</h2>

            <p>
              Simulate GPS, camera-trap sensor data and run the full monitoring
              pipeline.
            </p>
          </div>
        </div>

        {error && <div className="monitoring-error">{error}</div>}

        {sensors.length === 0 ? (
          <div className="monitoring-empty">No active sensors available.</div>
        ) : (
          <form className="simulate-form" onSubmit={submit}>
            <label className="monitoring-form-field simulation-full-width">
              <span>Registered Sensor</span>

              <select value={form.sensorId} onChange={changeSensor}>
                {sensors.map((sensor) => (
                  <option key={sensor._id} value={sensor.sensorId}>
                    {sensor.sensorId} — {sensor.name}
                  </option>
                ))}
              </select>
            </label>

            {selectedSensor && (
              <div className="selected-sensor-info simulation-full-width">
                <div>
                  <span>Type</span>
                  <strong>{formatSensorType(selectedSensor.type)}</strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong>{selectedSensor.status}</strong>
                </div>

                <div>
                  <span>Current Location</span>

                  <strong>
                    {selectedSensor.location?.latitude},{" "}
                    {selectedSensor.location?.longitude}
                  </strong>
                </div>
              </div>
            )}

            <label className="monitoring-form-field">
              <span>Latitude</span>

              <input
                type="number"
                step="any"
                min="-90"
                max="90"
                name="latitude"
                value={form.latitude}
                onChange={handleChange}
                required
              />
            </label>

            <label className="monitoring-form-field">
              <span>Longitude</span>

              <input
                type="number"
                step="any"
                min="-180"
                max="180"
                name="longitude"
                value={form.longitude}
                onChange={handleChange}
                required
              />
            </label>

            <SensorFields
              sensor={selectedSensor}
              form={form}
              onChange={handleChange}
            />

            <div className="simulation-submit-row">
              <button
                type="submit"
                className="monitoring-primary-button"
                disabled={submitting}
              >
                {submitting ? "Processing..." : "Process Reading"}
              </button>
            </div>
          </form>
        )}
      </article>

      <SimulationResult result={result} zones={zones} />
    </section>
  );
}

function SensorFields({ sensor, form, onChange }) {
  if (!sensor) {
    return null;
  }

  if (sensor.type === "GPS_COLLAR") {
    return (
      <label className="monitoring-form-field simulation-full-width">
        <span>Battery Level %</span>

        <input
          type="number"
          min="0"
          max="100"
          name="batteryLevel"
          value={form.batteryLevel}
          onChange={onChange}
          required
        />
      </label>
    );
  }

  if (sensor.type === "CAMERA_TRAP") {
    return (
      <>
        <label className="monitoring-form-field">
          <span>Detection</span>

          <select name="detection" value={form.detection} onChange={onChange}>
            <option value="NONE">None</option>

            <option value="HUMAN">Human</option>

            <option value="ELEPHANT">Elephant</option>

            <option value="DEER">Deer</option>

            <option value="LEOPARD">Leopard</option>

            <option value="ANIMAL">Animal</option>
          </select>
        </label>

        <label className="monitoring-form-field">
          <span>Confidence</span>

          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            name="confidence"
            value={form.confidence}
            onChange={onChange}
            required
          />
        </label>
      </>
    );
  }

  return null;
}
