import { CommunityReport } from '../models/community-report.model.js';

export function createCommunityReportRepository(model = CommunityReport) {
  return {
    async create(report) {
      // Wait for the unique index before accepting the first write to a new collection.
      await model.init();
      return model.create(report);
    },
  };
}
