import { HttpError } from '../../../shared/http-error.js';
import { COMMUNITY_MEMBER } from '../config/auth.constants.js';
import { hashPassword } from '../utils/password.js';
import { toPublicUser } from './session.service.js';

function duplicateEmailError(error) {
  return error?.code === 11000 && error?.keyPattern?.email;
}

export async function registerMember(input, users) {
  try {
    const passwordHash = await hashPassword(input.password);
    const user = await users.create({
      fullName: input.fullName, email: input.email, passwordHash, role: COMMUNITY_MEMBER,
    });
    return toPublicUser(user);
  } catch (error) {
    if (duplicateEmailError(error)) throw new HttpError(409, 'An account with this email already exists.');
    throw error;
  }
}
