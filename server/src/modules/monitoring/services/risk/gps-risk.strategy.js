import { isInsideRiskZone } from "../../utils/geo.utils.js";

export class GpsRiskStrategy {
  analyze({ location, riskZones }) {
    const matches = riskZones
      .map((zone) => ({
        zone,
        ...isInsideRiskZone(location, zone),
      }))
      .filter(({ inside }) => inside)
      .sort((first, second) => first.distanceMeters - second.distanceMeters);

    if (matches.length === 0) {
      return this.safeResult();
    }

    return this.riskResult(matches[0]);
  }

  safeResult() {
    return {
      riskDetected: false,
      level: "NONE",
      type: null,
      message: "GPS reading is outside configured risk zones.",
      zoneId: null,
      distanceMeters: null,
      metadata: {},
    };
  }

  riskResult(match) {
    return {
      riskDetected: true,
      level: match.zone.severity ?? "HIGH",

      type: "HIGH_RISK_ZONE_ENTRY",

      message: `Sensor entered risk zone: ${match.zone.name}`,

      zoneId: match.zone._id,

      distanceMeters: Math.round(match.distanceMeters),

      metadata: {
        zoneName: match.zone.name,

        radiusMeters: match.zone.radiusMeters,
      },
    };
  }
}
