import mongoose from 'mongoose';

import {
  PARK_RANGER,
  APPROVED,
} from '../../auth/config/auth.constants.js';

import {
  HttpError,
} from '../../../shared/http-error.js';

export function requireParkRanger(users) {
  return async function parkRangerOnly(
    req,
    res,
    next,
  ) {
    try {
      if (
        !mongoose.isObjectIdOrHexString(
          req.auth.userId,
        )
      ) {
        throw new HttpError(
          401,
          'Authentication required.',
        );
      }

      const user =
        await users.findById(
          req.auth.userId,
        );

      if (!user) {
        throw new HttpError(
          401,
          'Authentication required.',
        );
      }

      if (
        req.auth.role !== PARK_RANGER
        || user.role !== PARK_RANGER
      ) {
        throw new HttpError(
          403,
          'Only Park Rangers can report field incidents.',
        );
      }

      if (
        user.approvalStatus !== APPROVED
      ) {
        throw new HttpError(
          403,
          'Your Ranger account is not approved.',
        );
      }

      req.parkRanger = user;

      return next();
    } catch (error) {
      return next(error);
    }
  };
}