import { GpsRiskStrategy } from "./gps-risk.strategy.js";
import { CameraRiskStrategy } from "./camera-risk.strategy.js";

export class RiskStrategyRegistry {
  constructor(entries) {
    this.strategies = new Map(entries);
  }

  get(sensorType) {
    const strategy = this.strategies.get(sensorType);

    if (!strategy) {
      throw new Error(`No risk strategy configured for ${sensorType}.`);
    }

    return strategy;
  }
}

export const riskStrategyRegistry = new RiskStrategyRegistry([
  ["GPS_COLLAR", new GpsRiskStrategy()],

  ["CAMERA_TRAP", new CameraRiskStrategy()],
]);
