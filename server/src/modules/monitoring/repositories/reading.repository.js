import { Reading } from "../models/reading.model.js";

export class ReadingRepository {
  create(data) {
    return Reading.create(data);
  }

  findRecent(limit = 100) {
    return Reading.find().sort({ createdAt: -1 }).limit(limit).lean();
  }

  findById(id) {
    return Reading.findById(id).lean();
  }

  markProcessed(readingId) {
    return Reading.findByIdAndUpdate(
      readingId,
      {
        $set: {
          processingStatus: "PROCESSED",
          failureReason: null,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );
  }

  markFailed(readingId, reason) {
    return Reading.findByIdAndUpdate(
      readingId,
      {
        $set: {
          processingStatus: "PROCESSING_FAILED",
          failureReason: reason,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );
  }

  count(filter = {}) {
    return Reading.countDocuments(filter);
  }
}

export const readingRepository = new ReadingRepository();
