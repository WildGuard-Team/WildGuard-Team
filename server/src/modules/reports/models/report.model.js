import mongoose from 'mongoose';
import {
  REPORT_TYPES, DESCRIPTION_LIMITS, MANUAL_LOCATION_LIMITS,
  MANUAL_LOCATION_SOURCE, WEB_REPORT_SOURCE,
} from '../config/report.constants.js';

const locationSchema = new mongoose.Schema({
  locationSource: { type: String, required: true, enum: [MANUAL_LOCATION_SOURCE] },
  manualLocation: {
    type: String, required: true, trim: true,
    minlength: MANUAL_LOCATION_LIMITS.min, maxlength: MANUAL_LOCATION_LIMITS.max,
  },
}, { _id: false });

const reportSchema = new mongoose.Schema({
  referenceNumber: { type: String, required: true, unique: true },
  reporterId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  reportType: { type: String, required: true, enum: REPORT_TYPES },
  description: {
    type: String, required: true, trim: true,
    minlength: DESCRIPTION_LIMITS.min, maxlength: DESCRIPTION_LIMITS.max,
  },
  location: { type: locationSchema, required: true },
  source: { type: String, required: true, enum: [WEB_REPORT_SOURCE], default: WEB_REPORT_SOURCE },
}, { timestamps: true });

export const Report = mongoose.models.Report || mongoose.model('Report', reportSchema);
