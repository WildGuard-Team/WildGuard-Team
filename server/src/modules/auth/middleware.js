import { HttpError } from '../../shared/http-error.js';

export function requireAuthentication(req, res, next) {
  if (!req.session?.userId) return next(new HttpError(401, 'Authentication required.'));
  return next();
}

export function requireTrustedOrigin(clientOrigin) {
  return (req, res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
    const origin = req.get('origin');
    if (origin && origin !== clientOrigin) return next(new HttpError(403, 'Request origin is not allowed.'));
    return next();
  };
}
