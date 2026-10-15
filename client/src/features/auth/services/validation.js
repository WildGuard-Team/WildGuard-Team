const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const passwordMessage = 'Password must be 6–12 characters.';

export function validateRegistrationField(name, values) {
  if (name === 'fullName' && (values.fullName.trim().replace(/\s+/g, ' ').length < 2 || values.fullName.trim().length > 100)) {
    return 'Use a name between 2 and 100 characters.';
  }
  if (name === 'email' && (!emailPattern.test(values.email.trim()) || values.email.trim().length > 254)) return 'Enter a valid email address.';
  if (name === 'password' && (values.password.length < 6 || values.password.length > 12)) return passwordMessage;
  if (name === 'confirmPassword' && (!values.confirmPassword || values.confirmPassword !== values.password)) return 'Passwords do not match.';
  return undefined;
}

export function validateRegistration(values) {
  const errors = {};
  for (const name of ['fullName', 'email', 'password', 'confirmPassword']) {
    const error = validateRegistrationField(name, values);
    if (error) errors[name] = error;
  }
  return errors;
}

export function validateLoginField(name, values) {
  if (name === 'email' && (!emailPattern.test(values.email.trim()) || values.email.trim().length > 254)) return 'Enter a valid email address.';
  if (name === 'password' && (values.password.length < 6 || values.password.length > 12)) return passwordMessage;
  return undefined;
}

export function validateLogin(values) {
  const errors = {};
  for (const name of ['email', 'password']) {
    const error = validateLoginField(name, values);
    if (error) errors[name] = error;
  }
  return errors;
}
