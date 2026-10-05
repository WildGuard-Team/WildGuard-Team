import { Report } from '../models/report.model.js';

export function createReportRepository(model = Report) {
  return {
    async create(report) {
      // Wait for the unique index before accepting the first write to a new collection.
      await model.init();
      return model.create(report);
    },
  };
}
