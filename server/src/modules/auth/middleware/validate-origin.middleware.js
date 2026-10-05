import { HttpError } from '../../../shared/http-error.js';

export function requireTrustedOrigin(clientOrigin) {
  return (req, res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
    const origin = req.get('origin');
    if (origin && origin !== clientOrigin) return next(new HttpError(403, 'Request origin is not allowed.'));
    return next();
  };
}
