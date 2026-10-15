import mongoose from 'mongoose';
import { CONSERVATION_REPORT_TYPE_VALUES } from '../config/conservation-report.constants.js';

const reportFiltersSchema = new mongoose.Schema({
  park: { type: String, trim: true },
  location: { type: String, trim: true },
  incidentTypes: { type: [String], default: undefined },
  severities: { type: [String], default: undefined },
  routeSourceIds: { type: [String], default: undefined },
  statuses: { type: [String], default: undefined },
  conflictTypes: { type: [String], default: undefined },
}, { _id: false });

const reportParametersSchema = new mongoose.Schema({
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  filters: { type: reportFiltersSchema, default: () => ({}) },
}, { _id: false });

const generatedConservationReportSchema = new mongoose.Schema({
  reportId: { type: String, required: true, unique: true, trim: true },
  reportType: { type: String, required: true, enum: CONSERVATION_REPORT_TYPE_VALUES, index: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  parameters: { type: reportParametersSchema, required: true },
  generatedAt: { type: Date, required: true, default: Date.now },
  results: { type: mongoose.Schema.Types.Mixed, required: true },
  dataProvenance: { type: [String], required: true },
  fileLocation: { type: String, required: true, trim: true },
}, { timestamps: true, collection: 'generated_conservation_reports' });

generatedConservationReportSchema.index({ requestedBy: 1, generatedAt: -1 });

export const GeneratedConservationReport = mongoose.models.GeneratedConservationReport
  || mongoose.model('GeneratedConservationReport', generatedConservationReportSchema);
