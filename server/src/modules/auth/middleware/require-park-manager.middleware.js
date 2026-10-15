import mongoose from 'mongoose';

import {
  PARK_MANAGER,
} from '../config/auth.constants.js';

import {
  HttpError,
} from '../../../shared/http-error.js';

export function requireParkManager(users) {
  return async function parkManagerOnly(req, res, next) {
    try {
      if (!mongoose.isObjectIdOrHexString(req.auth.userId)) {
        throw new HttpError(
          401,
          'Authentication required.',
        );
      }

      const user = await users.findById(req.auth.userId);

      if (!user) {
        throw new HttpError(
          401,
          'Authentication required.',
        );
      }

      if (
        req.auth.role !== PARK_MANAGER
        || user.role !== PARK_MANAGER
      ) {
        throw new HttpError(
          403,
          'Only Park Managers can access this resource.',
        );
      }

      req.parkManager = user;

      return next();
    } catch (error) {
      return next(error);
    }
  };
}