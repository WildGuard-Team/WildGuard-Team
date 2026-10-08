import { HttpError } from '../../../shared/http-error.js';

import {
  PARK_RANGER,
  PENDING,
} from '../config/auth.constants.js';

import { hashPassword } from '../utils/password.js';
import { toPublicUser } from './session.service.js';

function duplicateAccountError(error) {
  return error?.code === 11000;
}

export async function registerRanger(input, users) {
  try {
    const passwordHash =
      await hashPassword(input.password);

    const user = await users.create({
      fullName: input.fullName,
      email: input.email,
      passwordHash,
      role: PARK_RANGER,
      approvalStatus: PENDING,
      rangerId: input.rangerId,
      assignedPark: input.assignedPark,
    });

    return toPublicUser(user);
  } catch (error) {
    if (duplicateAccountError(error)) {
      throw new HttpError(
        409,
        'An account with this email or Ranger ID already exists.',
      );
    }

    throw error;
  }
}