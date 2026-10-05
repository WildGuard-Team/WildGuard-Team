import { HttpError } from '../../../shared/http-error.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validationError(message) {
  return new HttpError(400, message);
}

export function isValidEmail(email) {
  return emailPattern.test(email) && email.length <= 254;
}
