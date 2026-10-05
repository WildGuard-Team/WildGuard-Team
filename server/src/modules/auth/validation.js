import { HttpError } from '../../shared/http-error.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validationError(message) {
  return new HttpError(400, message);
}

export function validateRegistration(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw validationError('A JSON object is required.');
  if (Object.hasOwn(body, 'role')) throw validationError('Role cannot be set during public registration.');
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim().replace(/\s+/g, ' ') : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (fullName.length < 2 || fullName.length > 100) throw validationError('Full name must be between 2 and 100 characters.');
  if (!emailPattern.test(email) || email.length > 254) throw validationError('Enter a valid email address.');
  if (password.length < 12 || password.length > 128) throw validationError('Password must be between 12 and 128 characters.');
  return { fullName, email, password };
}

export function validateLogin(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw validationError('A JSON object is required.');
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!emailPattern.test(email) || email.length > 254 || password.length === 0 || password.length > 128) {
    throw validationError('Email and password are required.');
  }
  return { email, password };
}
