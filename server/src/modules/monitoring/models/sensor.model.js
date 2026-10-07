import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
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
  {
    _id: false,
  },
);

const sensorSchema = new mongoose.Schema(
  {
    sensorId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      required: true,
      enum: ["GPS_COLLAR", "CAMERA_TRAP"],
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "FAILED"],
      default: "ACTIVE",
    },

    animalId: {
      type: String,
      trim: true,
      default: null,
    },

    expectedIntervalMinutes: {
      type: Number,
      required: true,
      min: 1,
      default: 30,
    },

    location: {
      type: locationSchema,
      required: true,
    },

    lastSeenAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export const Sensor =
  mongoose.models.Sensor || mongoose.model("Sensor", sensorSchema);
