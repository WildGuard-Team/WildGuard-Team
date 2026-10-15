import { User } from '../models/user.model.js';
import {
  PARK_RANGER,
  PENDING,
} from '../config/auth.constants.js';

export function createUserRepository(model = User) {
  return {
    create(user) {
      return model.create(user);
    },

    findByEmail(email) {
      return model
        .findOne({ email })
        .select('+passwordHash');
    },

    findById(id) {
      return model.findById(id);
    },

    findRangers() {
      return model
        .find({ role: PARK_RANGER })
        .select(
          'fullName email rangerId assignedPark approvalStatus createdAt',
        )
        .sort({ createdAt: -1 });
    },

    findPendingRangers() {
      return model
        .find({
          role: PARK_RANGER,
          approvalStatus: PENDING,
        })
        .select(
          'fullName email rangerId assignedPark approvalStatus createdAt',
        )
        .sort({ createdAt: -1 });
    },

    findRangerById(id) {
      return model.findOne({
        _id: id,
        role: PARK_RANGER,
      });
    },
    
    updateRangerApprovalStatus(id, approvalStatus) {
      return model.findOneAndUpdate(
        {
          _id: id,
          role: PARK_RANGER,
        },
        {
          $set: { approvalStatus },
        },
        {
          new: true,
        },
      );
    },
  };
}
