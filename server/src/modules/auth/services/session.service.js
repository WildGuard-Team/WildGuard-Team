import { HttpError } from '../../../shared/http-error.js';

export function toPublicUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export async function getCurrentMember(userId, users) {
  const user = await users.findById(userId);
  if (!user) throw new HttpError(401, 'Authentication required.');
  return toPublicUser(user);
}
