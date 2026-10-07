import { RiskZone } from "../models/risk-zone.model.js";

const DEFAULT_RISK_ZONES = [
  {
    name: "Low Risk Monitoring Zone",
    description: "Area requiring low-level wildlife monitoring.",
    center: {
      latitude: 7.35,
      longitude: 80.55,
    },
    radiusMeters: 1200,
    severity: "LOW",
    active: true,
  },

  {
    name: "Medium Risk Buffer Zone",
    description: "Area with moderate wildlife conflict potential.",
    center: {
      latitude: 7.4,
      longitude: 80.7,
    },
    radiusMeters: 1500,
    severity: "MEDIUM",
    active: true,
  },

  {
    name: "Village Boundary Zone",
    description: "High-risk wildlife conflict area.",
    center: {
      latitude: 7.2906,
      longitude: 80.6337,
    },
    radiusMeters: 2000,
    severity: "HIGH",
    active: true,
  },

  {
    name: "Critical Human Wildlife Conflict Zone",
    description:
      "Critical wildlife conflict area requiring immediate response.",
    center: {
      latitude: 7.5,
      longitude: 80.8,
    },
    radiusMeters: 1000,
    severity: "CRITICAL",
    active: true,
  },
];

export async function seedRiskZone() {
  const zones = [];

  for (const zone of DEFAULT_RISK_ZONES) {
    const savedZone = await RiskZone.findOneAndUpdate(
      {
        name: zone.name,
      },
      {
        $set: zone,
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      },
    );

    zones.push(savedZone);
  }

  return zones;
}
