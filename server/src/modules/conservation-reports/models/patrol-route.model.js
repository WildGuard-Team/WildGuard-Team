import mongoose from 'mongoose';
import {
  REPORTING_DATASET_ID, SEEDED_DATA_PROVENANCE,
} from '../config/reporting-data.constants.js';

const patrolRouteSchema = new mongoose.Schema({
  sourceId: { type: String, required: true, unique: true, trim: true },
  park: { type: String, required: true, trim: true, index: true },
  name: { type: String, required: true, trim: true },
  zones: { type: [String], required: true },
  plannedDistanceKm: { type: Number, required: true, min: 0 },
  dataProvenance: {
    type: String, required: true, enum: [SEEDED_DATA_PROVENANCE], default: SEEDED_DATA_PROVENANCE,
  },
  datasetId: { type: String, required: true, default: REPORTING_DATASET_ID },
}, { timestamps: true, collection: 'report_patrol_routes' });

export const PatrolRoute = mongoose.models.PatrolRoute
  || mongoose.model('PatrolRoute', patrolRouteSchema);
