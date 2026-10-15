import mongoose from "mongoose";

const riskZoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    center: {
      latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90,
      },

      longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180,
      },
    },

    radiusMeters: {
      type: Number,
      required: true,
      min: 1,
    },

    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
      required: true,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export const RiskZone =
  mongoose.models.MonitoringRiskZone ||
  mongoose.model("MonitoringRiskZone", riskZoneSchema);
