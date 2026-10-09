import mongoose from "mongoose";

const deliveryAttemptSchema = new mongoose.Schema(
  {
    attemptedAt: {
      type: Date,
      required: true,
    },

    success: {
      type: Boolean,
      required: true,
    },

    recipient: {
      type: String,
      required: true,
    },

    error: {
      type: String,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const alertSchema = new mongoose.Schema(
  {
    readingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MonitoringReading",
      required: true,
    },

    analysisId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MonitoringAnalysis",
      required: true,
    },

    sensorId: {
      type: String,
      required: true,
      index: true,
    },

    type: {
      type: String,
      required: true,
    },

    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    location: {
      latitude: Number,
      longitude: Number,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "RESOLVED"],
      default: "ACTIVE",
      required: true,
      index: true,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },

    deliveryStatus: {
      type: String,
      enum: ["PENDING", "DELIVERED"],
      default: "PENDING",
    },

    recipient: {
      type: String,
      default: "RANGER_MANAGER",
    },

    deliveryAttempts: {
      type: [deliveryAttemptSchema],
      default: [],
    },

    deliveredAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

alertSchema.index({
  status: 1,
  createdAt: -1,
});

alertSchema.index({
  deliveryStatus: 1,
  createdAt: -1,
});

alertSchema.index({
  sensorId: 1,
  status: 1,
});

export const Alert =
  mongoose.models.MonitoringAlert ||
  mongoose.model("MonitoringAlert", alertSchema);
