import { ProcessingLog } from "../models/processing-log.model.js";

export class ProcessingLogRepository {
  create(data) {
    return ProcessingLog.create(data);
  }

  findRecent(limit = 200) {
    return ProcessingLog.find().sort({ createdAt: -1 }).limit(limit).lean();
  }

  count(filter = {}) {
    return ProcessingLog.countDocuments(filter);
  }
}

export const processingLogRepository = new ProcessingLogRepository();
