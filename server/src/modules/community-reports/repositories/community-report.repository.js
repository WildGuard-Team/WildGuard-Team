import { CommunityReport } from '../models/community-report.model.js';

export function createCommunityReportRepository(model = CommunityReport) {
  return {
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
    async create(report) {
      // Wait for the unique index before accepting the first write to a new collection.
      await model.init();
      return model.create(report);
    },
  };
}
