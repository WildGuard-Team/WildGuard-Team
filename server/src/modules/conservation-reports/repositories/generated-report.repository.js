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
    listForManager({ managerId, reportType, skip, limit }) {
      const query = { requestedBy: managerId };
      if (reportType) query.reportType = reportType;
      return model.find(query)
        .select('reportId reportType parameters generatedAt dataProvenance fileLocation')
        .sort({ generatedAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    },
    countForManager({ managerId, reportType }) {
      const query = { requestedBy: managerId };
      if (reportType) query.reportType = reportType;
      return model.countDocuments(query);
    },
  };
}
