import { Sensor } from "../models/sensor.model.js";

export class SensorRepository {
  findAll() {
    return Sensor.find().sort({ createdAt: -1 }).lean();
  }

  findById(id) {
    return Sensor.findById(id);
  }

  findBySensorId(sensorId) {
    return Sensor.findOne({
      sensorId: String(sensorId).toUpperCase(),
    });
  }

  create(data) {
    return Sensor.create(data);
  }

  updateById(id, data) {
    return Sensor.findByIdAndUpdate(
      id,
      { $set: data },
      {
        new: true,
        runValidators: true,
      },
    );
  }

  deleteById(id) {
    return Sensor.findByIdAndDelete(id);
  }

  updateLatestReading(sensorId, location, timestamp) {
    return Sensor.findOneAndUpdate(
      {
        sensorId: String(sensorId).toUpperCase(),
      },
      {
        $set: {
          location,
          lastSeenAt: timestamp,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );
  }

  setStatus(sensorId, status) {
    return Sensor.findOneAndUpdate(
      { sensorId },
      {
        $set: { status },
      },
      {
        new: true,
        runValidators: true,
      },
    );
  }

  count(filter = {}) {
    return Sensor.countDocuments(filter);
  }
}

export const sensorRepository = new SensorRepository();
