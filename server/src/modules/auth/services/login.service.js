import { HttpError } from '../../../shared/http-error.js';
import { verifyPassword } from '../utils/password.js';
import { toPublicUser } from './session.service.js';

export async function authenticateMember(input, users) {
  const user = await users.findByEmail(input.email);
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password.');
  }
  return toPublicUser(user);
}
