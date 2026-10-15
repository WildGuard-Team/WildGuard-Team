export class CameraRiskStrategy {
  analyze({ values }) {
    const detection = String(values?.detection ?? "").toUpperCase();
    const confidence = Number(values?.confidence ?? 0);

    const risky = detection === "ELEPHANT" && confidence >= 0.7;

    if (!risky) {
      return {
        riskDetected: false,
        level: "NONE",
        type: null,
        message: "No elephant detected by camera trap.",
        zoneId: null,
        distanceMeters: null,
        metadata: {
          detection,
          confidence,
        },
      };
    }

    return {
      riskDetected: true,
      level: "HIGH",
      type: "ELEPHANT_DETECTED",
      message: "Elephant detected by camera trap.",
      zoneId: null,
      distanceMeters: null,
      metadata: {
        detection,
        confidence,
      },
    };
  }
}
