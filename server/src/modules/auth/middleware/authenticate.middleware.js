import { HttpError } from '../../../shared/http-error.js';
import { AUTH_TOKEN_COOKIE } from '../config/auth.constants.js';
import { verifyAuthToken } from '../utils/token.js';

export function requireAuthentication(jwtSecret) {
  return (req, res, next) => {
    try {
      const token = readCookie(req.headers.cookie, AUTH_TOKEN_COOKIE);
      if (!token) throw new Error('Token missing.');
      req.auth = verifyAuthToken(token, jwtSecret);
      return next();
    } catch {
      return next(new HttpError(401, 'Authentication required.'));
    }
  };
}

function readCookie(header, name) {
  if (!header) return null;
  const value = header.split(';').map((entry) => entry.trim()).find((entry) => entry.startsWith(`${name}=`));
  return value ? decodeURIComponent(value.slice(name.length + 1)) : null;
}
