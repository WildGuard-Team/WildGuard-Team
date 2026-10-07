export class CameraRiskStrategy {
  analyze({ values }) {
    const detection = String(values?.detection ?? "").toUpperCase();

    const confidence = Number(values?.confidence ?? 0);

    const risky = detection === "HUMAN" && confidence >= 0.8;

    if (!risky) {
      return {
        riskDetected: false,
        level: "NONE",
        type: null,
        message: "No high-risk camera detection.",
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
      type: "HUMAN_DETECTED",
      message: "High-confidence human detection recorded by camera trap.",
      zoneId: null,
      distanceMeters: null,
      metadata: {
        detection,
        confidence,
      },
    };
  }
}
