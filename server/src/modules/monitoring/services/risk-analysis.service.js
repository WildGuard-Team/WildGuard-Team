import { riskZoneRepository } from "../repositories/risk-zone.repository.js";
import { riskStrategyRegistry } from "./risk/risk-strategy.registry.js";

export class RiskAnalysisService {
  constructor({ zones, strategies }) {
    this.zones = zones;
    this.strategies = strategies;
  }

  async analyze(context) {
    const riskZones = await this.zones.findActive();

    const strategy = this.strategies.get(context.sensor.type);

    return strategy.analyze({
      sensor: context.sensor,
      location: context.location,
      values: context.values,
      riskZones,
    });
  }
}

export const riskAnalysisService = new RiskAnalysisService({
  zones: riskZoneRepository,

  strategies: riskStrategyRegistry,
});
