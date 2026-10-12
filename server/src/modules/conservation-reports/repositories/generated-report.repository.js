import { GeneratedConservationReport } from '../models/generated-conservation-report.model.js';

export function createGeneratedReportRepository(model = GeneratedConservationReport) {
  return {
    async create(report) {
      await model.init();
      return model.create(report);
    },
    findByReportIdForManager(reportId, managerId) {
      return model.findOne({ reportId, requestedBy: managerId }).lean();
    },
  };
}
