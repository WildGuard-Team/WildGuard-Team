import { isValidEmail, validationError } from './validation.helpers.js';

export function validateLogin(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw validationError('A JSON object is required.');
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!isValidEmail(email) || password.length === 0 || password.length > 128) {
    throw validationError('Email and password are required.');
  }
  return { email, password };
}
