import {
    isValidEmail,
    validationError,
  } from './validation.helpers.js';
  
  export function validateRangerRegistration(body) {
    if (
      !body
      || typeof body !== 'object'
      || Array.isArray(body)
    ) {
      throw validationError('A JSON object is required.');
    }
  
    const fullName =
      typeof body.fullName === 'string'
        ? body.fullName.trim().replace(/\s+/g, ' ')
        : '';
  
    const email =
      typeof body.email === 'string'
        ? body.email.trim().toLowerCase()
        : '';
  
    const password =
      typeof body.password === 'string'
        ? body.password
        : '';
  
    const rangerId =
      typeof body.rangerId === 'string'
        ? body.rangerId.trim().toUpperCase()
        : '';
  
    const assignedPark =
      typeof body.assignedPark === 'string'
        ? body.assignedPark.trim().replace(/\s+/g, ' ')
        : '';
  
    if (
      fullName.length < 2
      || fullName.length > 100
    ) {
      throw validationError(
        'Full name must be between 2 and 100 characters.',
      );
    }
  
    if (!isValidEmail(email)) {
      throw validationError(
        'Enter a valid email address.',
      );
    }
  
    if (
      password.length < 6
      || password.length > 12
    ) {
      throw validationError(
        'Password must be 6–12 characters.',
      );
    }
  
    if (
      rangerId.length < 3
      || rangerId.length > 50
    ) {
      throw validationError(
        'Ranger ID must be between 3 and 50 characters.',
      );
    }
  
    if (
      assignedPark.length < 2
      || assignedPark.length > 100
    ) {
      throw validationError(
        'Assigned park must be between 2 and 100 characters.',
      );
    }
  
    return {
      fullName,
      email,
      password,
      rangerId,
      assignedPark,
    };
  }