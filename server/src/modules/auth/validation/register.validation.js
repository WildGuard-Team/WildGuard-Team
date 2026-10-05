import { isValidEmail, validationError } from './validation.helpers.js';

export function validateRegistration(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw validationError('A JSON object is required.');
  if (Object.hasOwn(body, 'role')) throw validationError('Role cannot be set during public registration.');
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim().replace(/\s+/g, ' ') : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (fullName.length < 2 || fullName.length > 100) throw validationError('Full name must be between 2 and 100 characters.');
  if (!isValidEmail(email)) throw validationError('Enter a valid email address.');
  if (password.length < 6 || password.length > 12) throw validationError('Password must be 6–12 characters.');
  return { fullName, email, password };
}
