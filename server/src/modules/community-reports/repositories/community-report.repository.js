import { CommunityReport } from '../models/community-report.model.js';

export function createCommunityReportRepository(model = CommunityReport) {
  return {
    findByIdAndReporter(reportId, reporterId) {
      return model.findOne({ _id: reportId, reporterId })
        .select('_id referenceNumber reportType description location status createdAt incidentDateTime evidence rejectionReason reviewedAt')
        .lean();
    },
    findByReporter(reporterId, status) {
      const filter = { reporterId };
      if (status === 'under_review') {
        filter.$or = [{ status }, { status: { $exists: false } }];
      } else if (status) filter.status = status;
      return model.find(filter)
        .select('_id referenceNumber reportType description location status createdAt')
        .sort({ createdAt: -1, _id: -1 }).lean();
    },
    findBySubmission(reporterId, clientSubmissionId) {
      return model.findOne({ reporterId, clientSubmissionId });
    },
    findForManager(filters = {}) {
      const conditions = [];
      if (filters.status === 'under_review') {
        conditions.push({ $or: [{ status: 'under_review' }, { status: { $exists: false } }] });
      } else if (filters.status) conditions.push({ status: filters.status });
      if (filters.reportType) conditions.push({ reportType: filters.reportType });
      if (filters.startDate || filters.endDate) {
        const createdAt = {};
        if (filters.startDate) createdAt.$gte = filters.startDate;
        if (filters.endDate) createdAt.$lte = filters.endDate;
        conditions.push({ createdAt });
      }
      if (filters.search) {
        const search = new RegExp(escapeRegex(filters.search), 'i');
        conditions.push({ $or: [
          { referenceNumber: search }, { description: search },
          { 'location.displayName': search }, { 'location.manualLocation': search },
        ] });
      }
      const query = conditions.length ? { $and: conditions } : {};
      return model.find(query)
        .select('_id referenceNumber reporterId reportType description location status createdAt incidentDateTime rejectionReason reviewedAt')
        .populate('reporterId', 'fullName email')
        .sort({ createdAt: -1, _id: -1 }).lean();
    },
    findByIdForManager(reportId) {
      return model.findById(reportId)
        .select('_id referenceNumber reporterId reportType description location status createdAt incidentDateTime evidence rejectionReason reviewedAt reviewedBy')
        .populate('reporterId', 'fullName email')
        .populate('reviewedBy', 'fullName')
        .lean();
    },
    updateReviewStatus(reportId, review) {
      return model.findOneAndUpdate(
        { _id: reportId, $or: [{ status: 'under_review' }, { status: { $exists: false } }] },
        {
          $set: {
            status: review.status,
            reviewedBy: review.reviewedBy,
            reviewedAt: review.reviewedAt,
            ...(review.rejectionReason ? { rejectionReason: review.rejectionReason } : {}),
          },
          ...(review.rejectionReason ? {} : { $unset: { rejectionReason: 1 } }),
        },
        { new: true },
      )
        .select('_id referenceNumber reporterId reportType description location status createdAt incidentDateTime evidence rejectionReason reviewedAt reviewedBy')
        .populate('reporterId', 'fullName email')
        .populate('reviewedBy', 'fullName')
        .lean();
    },
    async create(report) {
      // Wait for the unique index before accepting the first write to a new collection.
      await model.init();
      return model.create(report);
    },
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
