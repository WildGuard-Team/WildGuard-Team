import mongoose from "mongoose";

const analysisSchema = new mongoose.Schema(
  {
    readingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MonitoringReading",
      required: true,
      unique: true,
    },

    sensorId: {
      type: String,
      required: true,
    },

    riskLevel: {
      type: String,
      enum: ["NONE", "LOW", "MEDIUM", "HIGH", "CRITICAL"],
      required: true,
    },

    riskDetected: {
      type: Boolean,
      required: true,
    },

    riskType: {
      type: String,
      default: null,
    },

    reason: {
      type: String,
      required: true,
    },

    zoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MonitoringRiskZone",
      default: null,
    },

    distanceMeters: {
      type: Number,
      default: null,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

export const Analysis =
  mongoose.models.MonitoringAnalysis ||
  mongoose.model("MonitoringAnalysis", analysisSchema);
