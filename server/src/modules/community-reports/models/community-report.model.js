import mongoose from 'mongoose';
import {
  COMMUNITY_REPORT_TYPES, COMMUNITY_REPORT_DESCRIPTION_LIMITS,
  COMMUNITY_REPORT_MANUAL_LOCATION_LIMITS, COMMUNITY_REPORT_MANUAL_LOCATION_SOURCE,
  COMMUNITY_REPORT_WEB_SOURCE,
} from '../config/community-report.constants.js';

const locationSchema = new mongoose.Schema({
  locationSource: { type: String, required: true, enum: [COMMUNITY_REPORT_MANUAL_LOCATION_SOURCE] },
  manualLocation: {
    type: String, required: true, trim: true,
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

// The former Report model used Mongoose's default pluralized "reports" collection.
// Retaining it explicitly prevents a code-only rename from redirecting persistence.
export const CommunityReport = mongoose.models.CommunityReport
  || mongoose.model('CommunityReport', communityReportSchema, 'reports');
