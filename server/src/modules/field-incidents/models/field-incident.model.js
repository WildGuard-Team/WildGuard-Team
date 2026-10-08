import mongoose from 'mongoose';

import {
  FIELD_INCIDENT_TYPES,
  FIELD_INCIDENT_RISK_LEVELS,
  FIELD_INCIDENT_LOCATION_SOURCES,
} from '../config/field-incident.constants.js';

const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['Point'],
    },

    coordinates: {
      type: [Number],
      required: true,
    },
  },
  {
    _id: false,
  },
);

const locationSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      enum: FIELD_INCIDENT_LOCATION_SOURCES,
      required: true,
    },

    point: {
      type: pointSchema,
      required: false,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    _id: false,
  },
);

const evidenceSchema = new mongoose.Schema(
  {
    publicId: {
      type: String,
      required: true,
      trim: true,
    },

    secureUrl: {
      type: String,
      required: true,
      trim: true,
    },

    resourceType: {
      type: String,
      required: true,
      enum: ['image', 'video'],
    },

    originalName: {
      type: String,
      required: true,
      trim: true,
    },

    mimeType: {
      type: String,
      required: true,
    },

    bytes: {
      type: Number,
      required: true,
      min: 1,
    },

    format: String,
    width: Number,
    height: Number,
    duration: Number,
  },
  {
    _id: false,
  },
);

const fieldIncidentSchema =
  new mongoose.Schema(
    {
      referenceNumber: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      rangerUserId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
        index: true,
      },

      rangerIdSnapshot: {
        type: String,
        required: true,
        trim: true,
      },

      assignedParkSnapshot: {
        type: String,
        required: true,
        trim: true,
      },

      incidentType: {
        type: String,
        required: true,
        enum: FIELD_INCIDENT_TYPES,
      },

      incidentDateTime: {
        type: Date,
        required: true,
      },

      riskLevel: {
        type: String,
        required: true,
        enum: FIELD_INCIDENT_RISK_LEVELS,
      },

      parkZone: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
      },

      blockArea: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
      },

      location: {
        type: locationSchema,
        required: true,
      },

      description: {
        type: String,
        required: true,
        trim: true,
        minlength: 10,
        maxlength: 1000,
      },

      additionalNotes: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: '',
      },

      evidence: {
        type: [evidenceSchema],
        default: [],
      },

      status: {
        type: String,
        enum: ['SUBMITTED'],
        default: 'SUBMITTED',
      },
    },
    {
      timestamps: true,
    },
  );

fieldIncidentSchema.index({
  'location.point': '2dsphere',
});

export const FieldIncident =
  mongoose.models.FieldIncident
  || mongoose.model(
    'FieldIncident',
    fieldIncidentSchema,
  );