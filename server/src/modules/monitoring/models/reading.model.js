import mongoose from "mongoose";

const readingSchema = new mongoose.Schema(
  {
    sensorId: {
      type: String,
      required: true,
      index: true,
    },

    sensorType: {
      type: String,
      default: null,
    },

    timestamp: {
      type: Date,
      default: null,
    },

    location: {
      latitude: Number,
      longitude: Number,
    },

    values: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    rawData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    validationStatus: {
      type: String,
      enum: ["VALID", "REJECTED"],
      required: true,
    },

    processingStatus: {
      type: String,
      enum: ["REJECTED", "PENDING", "PROCESSED", "PROCESSING_FAILED"],
      required: true,
    },

    rejectionReasons: {
      type: [String],
      default: [],
    },

    failureReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

readingSchema.index({ createdAt: -1 });
readingSchema.index({ sensorId: 1, timestamp: -1 });

export const Reading =
  mongoose.models.MonitoringReading ||
  mongoose.model("MonitoringReading", readingSchema);
