import { AUTH_TOKEN_COOKIE } from '../config/auth.constants.js';

export function createLogoutController({ nodeEnv }) {
  return async function logout(req, res) {
    res.clearCookie(AUTH_TOKEN_COOKIE, {
      httpOnly: true, sameSite: 'lax', secure: nodeEnv === 'production', path: '/',
    });
    res.status(200).json({ message: 'Logged out.' });
  };
}
