import mongoose from 'mongoose';
import {
  INCIDENT_SEVERITIES, REPORTING_DATASET_ID, SEEDED_DATA_PROVENANCE,
} from '../config/reporting-data.constants.js';

const reportSourceIncidentSchema = new mongoose.Schema({
  sourceId: { type: String, required: true, unique: true, trim: true },
  occurredAt: { type: Date, required: true, index: true },
  park: { type: String, required: true, trim: true, index: true },
  location: { type: String, required: true, trim: true },
  incidentType: { type: String, required: true, trim: true, index: true },
  severity: { type: String, required: true, enum: INCIDENT_SEVERITIES, index: true },
  humanWildlifeConflict: { type: Boolean, required: true, default: false, index: true },
  conflictType: { type: String, trim: true },
  species: { type: String, trim: true },
  dataProvenance: {
    type: String, required: true, enum: [SEEDED_DATA_PROVENANCE], default: SEEDED_DATA_PROVENANCE,
  },
  datasetId: { type: String, required: true, default: REPORTING_DATASET_ID },
}, { timestamps: true, collection: 'report_source_incidents' });

export const ReportSourceIncident = mongoose.models.ReportSourceIncident
  || mongoose.model('ReportSourceIncident', reportSourceIncidentSchema);
