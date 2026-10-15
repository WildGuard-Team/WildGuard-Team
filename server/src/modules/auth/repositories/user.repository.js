import { User } from '../models/user.model.js';

export function createUserRepository(model = User) {
  return {
    create(user) { return model.create(user); },
    findByEmail(email) { return model.findOne({ email }).select('+passwordHash'); },
    findById(id) { return model.findById(id); },
  };
}
