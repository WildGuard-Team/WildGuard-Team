import { Router } from "express";

import {
  getSensors,
  createSensor,
  updateSensor,
  deleteSensor,
} from "../controllers/sensor.controller.js";

import {
  simulateReading,
  getReadings,
  getAlerts,
  getAlertById,
  getLogs,
  getRiskZones,
  getDashboard,
  checkSensorHealth,
} from "../controllers/monitoring.controller.js";

export function createMonitoringRouter() {
  const router = Router();

  router.get("/dashboard", getDashboard);

  router.get("/sensors", getSensors);

  router.post("/sensors", createSensor);

  router.put("/sensors/:id", updateSensor);

  router.delete("/sensors/:id", deleteSensor);

  router.post("/sensors/check-health", checkSensorHealth);

  router.get("/readings", getReadings);

  router.post("/readings/simulate", simulateReading);

  router.get("/alerts", getAlerts);

  router.get("/alerts/:id", getAlertById);

  router.get("/logs", getLogs);

  router.get("/risk-zones", getRiskZones);

  return router;
}
