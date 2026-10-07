import mongoose from "mongoose";

const processingLogSchema = new mongoose.Schema(
  {
    sensorId: {
      type: String,
      default: null,
    },

    readingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MonitoringReading",
      default: null,
    },

    alertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MonitoringAlert",
      default: null,
    },

    event: {
      type: String,
      required: true,
    },

    level: {
      type: String,
      enum: ["INFO", "WARNING", "ERROR"],
      default: "INFO",
    },

    message: {
      type: String,
      required: true,
    },

    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

processingLogSchema.index({ createdAt: -1 });

export const ProcessingLog =
  mongoose.models.MonitoringProcessingLog ||
  mongoose.model("MonitoringProcessingLog", processingLogSchema);
