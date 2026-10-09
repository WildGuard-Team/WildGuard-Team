import mongoose from 'mongoose';
import { COMMUNITY_MEMBER } from '../../auth/config/auth.constants.js';
import { HttpError } from '../../../shared/http-error.js';

export function requireCommunityMember(users) {
  return async (req, res, next) => {
    try {
      if (!mongoose.isObjectIdOrHexString(req.auth.userId)) {
        throw new HttpError(401, 'Authentication required.');
      }
      const user = await users.findById(req.auth.userId);
      if (!user) throw new HttpError(401, 'Authentication required.');
      if (req.auth.role !== COMMUNITY_MEMBER || user.role !== COMMUNITY_MEMBER) {
        throw new HttpError(403, 'Only Community Members can submit reports.');
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
