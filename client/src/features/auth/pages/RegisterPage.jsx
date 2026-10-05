import { useState } from 'react';
import AuthShell from '../components/AuthShell.jsx';
import FormAlert from '../components/FormAlert.jsx';
import FormField from '../components/FormField.jsx';
import PasswordField from '../components/PasswordField.jsx';
import SubmitButton from '../components/SubmitButton.jsx';
import { registerMember } from '../services/authApi.js';
import { validateRegistration } from '../services/validation.js';

const initialValues = { fullName: '', email: '', password: '', confirmPassword: '' };

export default function RegisterPage({ navigate }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  function update(event) {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
    setErrors((current) => ({ ...current, [event.target.name]: undefined }));
    setApiError('');
  }

  async function submit(event) {
    event.preventDefault();
    const nextErrors = validateRegistration(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setIsLoading(true);
    try {
      await registerMember({ fullName: values.fullName.trim(), email: values.email.trim(), password: values.password });
      navigate('/login', { message: 'Your account is ready. Please sign in.' });
    } catch (error) {
      setApiError(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell variant="register">
      <div className="form-heading"><h1>Join WildGuard</h1><p>Create your community member account.</p></div>
      <form noValidate onSubmit={submit}>
        <FormAlert>{apiError}</FormAlert>
        <FormField label="Full name" name="fullName" error={errors.fullName}>
          <input id="fullName" name="fullName" value={values.fullName} onChange={update} autoComplete="name" aria-invalid={Boolean(errors.fullName)} />
        </FormField>
        <FormField label="Email address" name="email" error={errors.email}>
          <input id="email" name="email" type="email" value={values.email} onChange={update} autoComplete="email" aria-invalid={Boolean(errors.email)} />
        </FormField>
        <div className="form-row">
          <PasswordField label="Password" name="password" value={values.password} onChange={update} error={errors.password} autoComplete="new-password" />
          <PasswordField label="Confirm password" name="confirmPassword" value={values.confirmPassword} onChange={update} error={errors.confirmPassword} autoComplete="new-password" />
        </div>
        <p className="password-hint">Use 12–128 characters.</p>
        <SubmitButton isLoading={isLoading}>Create account</SubmitButton>
      </form>
      <p className="form-switch">Already have an account? <button type="button" onClick={() => navigate('/login')}>Sign in</button></p>
    </AuthShell>
  );
}
