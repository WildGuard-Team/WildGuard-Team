import { CommunityReport } from '../models/community-report.model.js';

export function createCommunityReportRepository(model = CommunityReport) {
  return {
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
