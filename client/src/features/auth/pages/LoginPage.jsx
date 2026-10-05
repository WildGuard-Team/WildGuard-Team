import { useState } from 'react';
import { useAuth } from '../../../context/useAuth.js';
import AuthShell from '../components/AuthShell.jsx';
import FormAlert from '../components/FormAlert.jsx';
import FormField from '../components/FormField.jsx';
import { EmailIcon } from '../components/FieldIcons.jsx';
import PasswordField from '../components/PasswordField.jsx';
import SubmitButton from '../components/SubmitButton.jsx';
import { validateLogin, validateLoginField } from '../services/validation.js';

export default function LoginPage({ navigate, successMessage }) {
  const { login } = useAuth();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  function update(event) {
    const nextValues = { ...values, [event.target.name]: event.target.value };
    setValues(nextValues);
    if (touched[event.target.name]) {
      setErrors((current) => ({ ...current, [event.target.name]: validateLoginField(event.target.name, nextValues) }));
    }
    setApiError('');
  }

  function blur(event) {
    const { name } = event.target;
    setTouched((current) => ({ ...current, [name]: true }));
    setErrors((current) => ({ ...current, [name]: validateLoginField(name, values) }));
  }

  async function submit(event) {
    event.preventDefault();
    const nextErrors = validateLogin(values);
    setTouched({ email: true, password: true });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setIsLoading(true);
    try {
      await login({ email: values.email.trim(), password: values.password });
      navigate('/member');
    } catch (error) {
      setApiError(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="form-heading"><h1>Welcome back</h1><p>Sign in to your WildGuard account.</p></div>
      <form noValidate onSubmit={submit}>
        <FormAlert type="success">{successMessage}</FormAlert>
        <FormAlert>{apiError}</FormAlert>
        <FormField label="Email address" name="email" error={touched.email ? errors.email : undefined} icon={<EmailIcon />}>
          <input id="email" name="email" type="email" value={values.email} onChange={update} onBlur={blur} placeholder="Enter your email address" autoComplete="email" aria-invalid={Boolean(touched.email && errors.email)} aria-describedby={touched.email && errors.email ? 'email-error' : undefined} data-touched={touched.email || undefined} />
        </FormField>
        <PasswordField label="Password" name="password" value={values.password} onChange={update} onBlur={blur} error={touched.password ? errors.password : undefined} touched={touched.password} placeholder="Enter your password" />
        <SubmitButton isLoading={isLoading}>Sign in</SubmitButton>
      </form>
      <p className="form-switch">New to WildGuard? <button type="button" onClick={() => navigate('/register')}>Create an account</button></p>
    </AuthShell>
  );
}
