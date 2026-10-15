import { useState } from 'react';
import AuthShell from '../components/AuthShell.jsx';
import FormAlert from '../components/FormAlert.jsx';
import FormField from '../components/FormField.jsx';
import { EmailIcon } from '../components/FieldIcons.jsx';
import PasswordField from '../components/PasswordField.jsx';
import SubmitButton from '../components/SubmitButton.jsx';
import { registerMember } from '../services/authApi.js';
import { validateRegistration, validateRegistrationField } from '../services/validation.js';

const initialValues = { fullName: '', email: '', password: '', confirmPassword: '' };

export default function RegisterPage({ navigate }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const passwordCountInvalid = values.password.length > 0 && (values.password.length < 6 || values.password.length > 12);

  function update(event) {
    const { name, value } = event.target;
    const nextValues = { ...values, [name]: value };
    setValues(nextValues);
    setErrors((current) => {
      const nextErrors = { ...current };
      if (touched[name]) nextErrors[name] = validateRegistrationField(name, nextValues);
      if (name === 'password' && touched.confirmPassword) {
        nextErrors.confirmPassword = validateRegistrationField('confirmPassword', nextValues);
      }
      return nextErrors;
    });
    setApiError('');
  }

  function blur(event) {
    const { name } = event.target;
    setTouched((current) => ({ ...current, [name]: true }));
    setErrors((current) => ({ ...current, [name]: validateRegistrationField(name, values) }));
  }

  async function submit(event) {
    event.preventDefault();
    const nextErrors = validateRegistration(values);
    setTouched({ fullName: true, email: true, password: true, confirmPassword: true });
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
        <FormField label="Full name" name="fullName" error={touched.fullName ? errors.fullName : undefined}>
          <input id="fullName" name="fullName" value={values.fullName} onChange={update} onBlur={blur} placeholder="Enter your full name" autoComplete="name" aria-invalid={Boolean(touched.fullName && errors.fullName)} aria-describedby={touched.fullName && errors.fullName ? 'fullName-error' : undefined} data-touched={touched.fullName || undefined} />
        </FormField>
        <FormField label="Email address" name="email" error={touched.email ? errors.email : undefined} icon={<EmailIcon />}>
          <input id="email" name="email" type="email" value={values.email} onChange={update} onBlur={blur} placeholder="Enter your email address" autoComplete="email" aria-invalid={Boolean(touched.email && errors.email)} aria-describedby={touched.email && errors.email ? 'email-error' : undefined} data-touched={touched.email || undefined} />
        </FormField>
        <div className="form-row">
          <PasswordField label="Password" name="password" value={values.password} onChange={update} onBlur={blur} error={touched.password && errors.password ? `${errors.password} ${values.password.length} / 12 characters.` : undefined} hint={values.password ? `${values.password.length} / 12 characters` : undefined} hintError={passwordCountInvalid} touched={touched.password} placeholder="Enter your password" autoComplete="new-password" />
          <PasswordField label="Confirm password" name="confirmPassword" value={values.confirmPassword} onChange={update} onBlur={blur} error={touched.confirmPassword ? errors.confirmPassword : undefined} touched={touched.confirmPassword} placeholder="Re-enter your password" autoComplete="new-password" />
        </div>
        <SubmitButton isLoading={isLoading}>Create account</SubmitButton>
      </form>
      <div className="form-switch">
        <p>
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
          >
            Sign in
          </button>
        </p>

        <p>
          Are you a Park Ranger?{' '}
          <button
            type="button"
            onClick={() => navigate('/register-ranger')}
          >
            Register as Ranger
          </button>
        </p>
      </div>
    </AuthShell>
  );
}
