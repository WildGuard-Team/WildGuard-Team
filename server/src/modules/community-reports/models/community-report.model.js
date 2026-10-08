import mongoose from 'mongoose';
import {
  COMMUNITY_REPORT_TYPES, COMMUNITY_REPORT_DESCRIPTION_LIMITS,
  COMMUNITY_REPORT_DISPLAY_NAME_LIMITS, COMMUNITY_REPORT_LOCATION_SOURCES,
  COMMUNITY_REPORT_MANUAL_LOCATION_LIMITS,
  COMMUNITY_REPORT_WEB_SOURCE,
  COMMUNITY_REPORT_STATUSES,
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

const evidenceSchema = new mongoose.Schema({
  publicId: { type: String, required: true, trim: true },
  secureUrl: { type: String, required: true, trim: true },
  resourceType: { type: String, required: true, enum: ['image', 'video'] },
  originalName: { type: String, required: true, trim: true },
  mimeType: { type: String, required: true },
  bytes: { type: Number, required: true, min: 1 },
  format: { type: String },
  width: { type: Number },
  height: { type: Number },
  duration: { type: Number },
}, { _id: false });

const communityReportSchema = new mongoose.Schema({
  referenceNumber: { type: String, required: true, unique: true },
  reporterId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  clientSubmissionId: { type: String, required: true, trim: true, maxlength: 100 },
  reportType: { type: String, required: true, enum: COMMUNITY_REPORT_TYPES },
  status: { type: String, required: true, enum: COMMUNITY_REPORT_STATUSES, default: 'under_review' },
  description: {
    type: String, required: true, trim: true,
    minlength: COMMUNITY_REPORT_DESCRIPTION_LIMITS.min,
    maxlength: COMMUNITY_REPORT_DESCRIPTION_LIMITS.max,
  },
  location: { type: locationSchema, required: true },
  // New submissions require this in request validation; legacy documents may omit it.
  incidentDateTime: { type: Date, required: false },
  evidence: { type: [evidenceSchema], default: [] },
  source: {
    type: String, required: true,
    enum: [COMMUNITY_REPORT_WEB_SOURCE], default: COMMUNITY_REPORT_WEB_SOURCE,
  },
}, { timestamps: true });

communityReportSchema.index({ 'location.point': '2dsphere' });
communityReportSchema.index({ reporterId: 1, createdAt: -1, _id: -1 });
// Exclude legacy reports without a submission id so their existing data can coexist.
communityReportSchema.index({ reporterId: 1, clientSubmissionId: 1 }, {
  unique: true,
  partialFilterExpression: { clientSubmissionId: { $type: 'string' } },
});

// The former Report model used Mongoose's default pluralized "reports" collection.
// Retaining it explicitly prevents a code-only rename from redirecting persistence.
export const CommunityReport = mongoose.models.CommunityReport
  || mongoose.model('CommunityReport', communityReportSchema, 'reports');
