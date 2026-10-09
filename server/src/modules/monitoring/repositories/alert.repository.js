import { Alert } from "../models/alert.model.js";

export class AlertRepository {
  create(data) {
    return Alert.create(data);
  }

  findRecent(limit = 50) {
    return Alert.find().sort({ createdAt: -1 }).limit(limit);
  }

  findById(id) {
    return Alert.findById(id);
  }

  async addDeliveryAttempt(alertId, attempt) {
    const update = {
      $push: {
        deliveryAttempts: attempt,
      },
    };

    if (attempt.success) {
      update.$set = {
        deliveryStatus: "DELIVERED",
        deliveredAt: attempt.attemptedAt,
      };
    } else {
      update.$set = {
        deliveryStatus: "PENDING",
      };
    }

    return Alert.findByIdAndUpdate(alertId, update, {
      new: true,
      runValidators: true,
    });
  }

  resolveActiveAlertsForSensor(sensorId) {
    return Alert.updateMany(
      {
        sensorId,
        $or: [
          {
            status: "ACTIVE",
          },
          {
            status: {
              $exists: false,
            },
          },
          {
            status: null,
          },
        ],
      },
      {
        $set: {
          status: "RESOLVED",
          resolvedAt: new Date(),
        },
      },
      {
        runValidators: true,
      },
    );
  }

  count() {
    return Alert.countDocuments();
  }
}

export const alertRepository = new AlertRepository();
