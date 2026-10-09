import { authenticateMember } from '../services/login.service.js';
import { createAuthToken, getTokenExpiryMilliseconds } from '../utils/token.js';
import { validateLogin } from '../validation/login.validation.js';
import { AUTH_TOKEN_COOKIE } from '../config/auth.constants.js';

export function createLoginController(users, { jwtSecret, jwtExpiresIn, nodeEnv }) {
  return async function login(req, res) {
    const user = await authenticateMember(validateLogin(req.body), users);
    const expiresInMilliseconds = getTokenExpiryMilliseconds(jwtExpiresIn);
    const token = createAuthToken(user, jwtSecret, jwtExpiresIn);
    res.cookie(AUTH_TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: nodeEnv === 'production',
      expires: new Date(Date.now() + expiresInMilliseconds),
      path: '/',
    });
    res.status(200).json({ user });
  };
}
