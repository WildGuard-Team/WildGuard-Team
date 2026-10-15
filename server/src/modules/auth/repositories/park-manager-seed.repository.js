import { User } from '../models/user.model.js';

export function createParkManagerSeedRepository(model = User) {
  return {
    findByEmail(email) {
      return model.findOne({ email }).select('+passwordHash');
    },
    create(account) {
      return model.create(account);
    },
    updateById(id, changes) {
      return model.findByIdAndUpdate(id, { $set: changes }, { new: true });
    },
  };
}
