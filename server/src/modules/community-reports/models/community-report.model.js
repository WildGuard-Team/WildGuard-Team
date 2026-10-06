import mongoose from 'mongoose';
import {
  COMMUNITY_REPORT_TYPES, COMMUNITY_REPORT_DESCRIPTION_LIMITS,
  COMMUNITY_REPORT_DISPLAY_NAME_LIMITS, COMMUNITY_REPORT_LOCATION_SOURCES,
  COMMUNITY_REPORT_MANUAL_LOCATION_LIMITS,
  COMMUNITY_REPORT_WEB_SOURCE,
} from '../config/community-report.constants.js';

const pointSchema = new mongoose.Schema({
  type: { type: String, required: true, enum: ['Point'] },
  coordinates: { type: [Number], required: true },
}, { _id: false });

const locationSchema = new mongoose.Schema({
  source: { type: String, required: true, enum: COMMUNITY_REPORT_LOCATION_SOURCES },
  point: { type: pointSchema, required: false },
  displayName: {
    type: String, trim: true,
    maxlength: COMMUNITY_REPORT_DISPLAY_NAME_LIMITS.max,
  },
  manualLocation: {
    type: String, required: false, trim: true,
    minlength: COMMUNITY_REPORT_MANUAL_LOCATION_LIMITS.min,
    maxlength: COMMUNITY_REPORT_MANUAL_LOCATION_LIMITS.max,
  },
}, { _id: false });

const communityReportSchema = new mongoose.Schema({
  referenceNumber: { type: String, required: true, unique: true },
  reporterId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  reportType: { type: String, required: true, enum: COMMUNITY_REPORT_TYPES },
  description: {
    type: String, required: true, trim: true,
    minlength: COMMUNITY_REPORT_DESCRIPTION_LIMITS.min,
    maxlength: COMMUNITY_REPORT_DESCRIPTION_LIMITS.max,
  },
  location: { type: locationSchema, required: true },
  source: {
    type: String, required: true,
    enum: [COMMUNITY_REPORT_WEB_SOURCE], default: COMMUNITY_REPORT_WEB_SOURCE,
  },
}, { timestamps: true });

communityReportSchema.index({ 'location.point': '2dsphere' });

// The former Report model used Mongoose's default pluralized "reports" collection.
// Retaining it explicitly prevents a code-only rename from redirecting persistence.
export const CommunityReport = mongoose.models.CommunityReport
  || mongoose.model('CommunityReport', communityReportSchema, 'reports');
