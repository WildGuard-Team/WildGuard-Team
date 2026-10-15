export class ReadingFactory {
  createValid({ sensor, location, values, rawData, timestamp }) {
    return {
      sensorId: sensor.sensorId,
      sensorType: sensor.type,
      timestamp,
      location,
      values,
      rawData,
      validationStatus: "VALID",
      processingStatus: "PENDING",
      rejectionReasons: [],
      failureReason: null,
    };
  }

  createRejected({
    sensorId,
    sensorType = null,
    location = null,
    values = {},
    rawData,
    timestamp,
    rejectionReasons,
  }) {
    return {
      sensorId,
      sensorType,
      timestamp,
      location,
      values,
      rawData,
      validationStatus: "REJECTED",
      processingStatus: "REJECTED",
      rejectionReasons,
      failureReason: null,
    };
  }
}

export const readingFactory = new ReadingFactory();
