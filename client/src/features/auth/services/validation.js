const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegistration(values) {
  const errors = {};
  if (values.fullName.trim().replace(/\s+/g, ' ').length < 2 || values.fullName.trim().length > 100) {
    errors.fullName = 'Use a name between 2 and 100 characters.';
  }
  if (!emailPattern.test(values.email.trim()) || values.email.trim().length > 254) errors.email = 'Enter a valid email address.';
  if (values.password.length < 12 || values.password.length > 128) errors.password = 'Use a password between 12 and 128 characters.';
  if (values.confirmPassword !== values.password) errors.confirmPassword = 'Passwords do not match.';
  return errors;
}

export function validateLogin(values) {
  const errors = {};
  if (!emailPattern.test(values.email.trim()) || values.email.trim().length > 254) errors.email = 'Enter a valid email address.';
  if (!values.password || values.password.length > 128) errors.password = 'Enter your password.';
  return errors;
}
