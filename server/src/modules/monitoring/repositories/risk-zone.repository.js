import { RiskZone } from "../models/risk-zone.model.js";

export class RiskZoneRepository {
  findActive() {
    return RiskZone.find({
      active: true,
    }).lean();
  }

  findAll() {
    return RiskZone.find().sort({ createdAt: -1 }).lean();
  }

  create(data) {
    return RiskZone.create(data);
  }
}

export const riskZoneRepository = new RiskZoneRepository();
