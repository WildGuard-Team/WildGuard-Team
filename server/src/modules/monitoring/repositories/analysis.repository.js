import { Analysis } from "../models/analysis.model.js";

export class AnalysisRepository {
  create(data) {
    return Analysis.create(data);
  }

  findByReadingId(readingId) {
    return Analysis.findOne({
      readingId,
    }).lean();
  }
}

export const analysisRepository = new AnalysisRepository();
