import mongoose from 'mongoose';
import {
  PATROL_STATUSES, REPORTING_DATASET_ID, SEEDED_DATA_PROVENANCE,
} from '../config/reporting-data.constants.js';

const patrolRecordSchema = new mongoose.Schema({
  sourceId: { type: String, required: true, unique: true, trim: true },
  routeSourceId: { type: String, required: true, trim: true, index: true },
  park: { type: String, required: true, trim: true, index: true },
  rangerTeam: { type: String, required: true, trim: true },
  startedAt: { type: Date, required: true, index: true },
  endedAt: { type: Date, required: true },
  status: { type: String, required: true, enum: PATROL_STATUSES, index: true },
  distanceKm: { type: Number, required: true, min: 0 },
  zonesCovered: { type: [String], required: true },
  observations: { type: Number, required: true, min: 0, default: 0 },
  dataProvenance: {
    type: String, required: true, enum: [SEEDED_DATA_PROVENANCE], default: SEEDED_DATA_PROVENANCE,
  },
  datasetId: { type: String, required: true, default: REPORTING_DATASET_ID },
}, { timestamps: true, collection: 'report_patrol_records' });

export const PatrolRecord = mongoose.models.PatrolRecord
  || mongoose.model('PatrolRecord', patrolRecordSchema);
