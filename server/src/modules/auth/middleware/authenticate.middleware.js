import { HttpError } from '../../../shared/http-error.js';

export function requireAuthentication(req, res, next) {
  if (!req.session?.userId) return next(new HttpError(401, 'Authentication required.'));
  return next();
}
