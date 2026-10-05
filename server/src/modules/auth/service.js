import { HttpError } from '../../shared/http-error.js';
import { COMMUNITY_MEMBER } from './model.js';
import { hashPassword, verifyPassword } from './password.js';

function duplicateEmailError(error) {
  return error?.code === 11000 && error?.keyPattern?.email;
}

export function toPublicUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
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

export async function authenticateMember(input, users) {
  const user = await users.findByEmail(input.email);
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password.');
  }
  return toPublicUser(user);
}

export async function getMemberById(userId, users) {
  const user = await users.findById(userId);
  if (!user) throw new HttpError(401, 'Authentication required.');
  return toPublicUser(user);
}
