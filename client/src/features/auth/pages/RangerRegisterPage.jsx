import { useState } from 'react';

import AuthShell from '../components/AuthShell.jsx';
import FormAlert from '../components/FormAlert.jsx';
import FormField from '../components/FormField.jsx';
import { EmailIcon } from '../components/FieldIcons.jsx';
import PasswordField from '../components/PasswordField.jsx';
import SubmitButton from '../components/SubmitButton.jsx';

import {
  registerRanger,
} from '../services/authApi.js';

import {
  validateRangerRegistration,
  validateRangerRegistrationField,
} from '../services/validation.js';

const initialValues = {
  fullName: '',
  email: '',
  rangerId: '',
  assignedPark: '',
  password: '',
  confirmPassword: '',
};

export default function RangerRegisterPage({ navigate }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  function update(event) {
    const { name, value } = event.target;

    const nextValues = {
      ...values,
      [name]: value,
    };

    setValues(nextValues);

    if (touched[name]) {
      setErrors((current) => ({
        ...current,
        [name]: validateRangerRegistrationField(
          name,
          nextValues,
        ),
      }));
    }

    setApiError('');
  }

  function blur(event) {
    const { name } = event.target;

    setTouched((current) => ({
      ...current,
      [name]: true,
    }));

    setErrors((current) => ({
      ...current,
      [name]: validateRangerRegistrationField(
        name,
        values,
      ),
    }));
  }

  async function submit(event) {
    event.preventDefault();

    const nextErrors =
      validateRangerRegistration(values);

    setTouched({
      fullName: true,
      email: true,
      rangerId: true,
      assignedPark: true,
      password: true,
      confirmPassword: true,
    });

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    setIsLoading(true);

    try {
      await registerRanger({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        rangerId: values.rangerId.trim().toUpperCase(),
        assignedPark: values.assignedPark.trim(),
        password: values.password,
      });

      navigate('/login', {
        message:
          'Ranger registration submitted. Please wait for Park Manager approval before signing in.',
      });
    } catch (error) {
      setApiError(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell variant="register">
      <div className="form-heading">
        <h1>Park Ranger Registration</h1>

        <p>
          Register your ranger account. Your account must be
          approved by a Park Manager before you can sign in.
        </p>
      </div>

      <form noValidate onSubmit={submit}>
        <FormAlert>
          {apiError}
        </FormAlert>

        <FormField
          label="Full name"
          name="fullName"
          error={
            touched.fullName
              ? errors.fullName
              : undefined
          }
        >
          <input
            id="fullName"
            name="fullName"
            value={values.fullName}
            onChange={update}
            onBlur={blur}
            placeholder="Enter your full name"
            autoComplete="name"
          />
        </FormField>

        <FormField
          label="Email address"
          name="email"
          error={
            touched.email
              ? errors.email
              : undefined
          }
          icon={<EmailIcon />}
        >
          <input
            id="email"
            name="email"
            type="email"
            value={values.email}
            onChange={update}
            onBlur={blur}
            placeholder="Enter your email address"
            autoComplete="email"
          />
        </FormField>

        <FormField
          label="Ranger ID"
          name="rangerId"
          error={
            touched.rangerId
              ? errors.rangerId
              : undefined
          }
        >
          <input
            id="rangerId"
            name="rangerId"
            value={values.rangerId}
            onChange={update}
            onBlur={blur}
            placeholder="Example: DWC-RG-00125"
          />
        </FormField>

        <FormField
          label="Assigned Park"
          name="assignedPark"
          error={
            touched.assignedPark
              ? errors.assignedPark
              : undefined
          }
        >
          <input
            id="assignedPark"
            name="assignedPark"
            value={values.assignedPark}
            onChange={update}
            onBlur={blur}
            placeholder="Example: Yala National Park"
          />
        </FormField>

        <div className="form-row">
          <PasswordField
            label="Password"
            name="password"
            value={values.password}
            onChange={update}
            onBlur={blur}
            error={
              touched.password
                ? errors.password
                : undefined
            }
            touched={touched.password}
            placeholder="Enter password"
            autoComplete="new-password"
          />

          <PasswordField
            label="Confirm password"
            name="confirmPassword"
            value={values.confirmPassword}
            onChange={update}
            onBlur={blur}
            error={
              touched.confirmPassword
                ? errors.confirmPassword
                : undefined
            }
            touched={touched.confirmPassword}
            placeholder="Re-enter password"
            autoComplete="new-password"
          />
        </div>

        <SubmitButton isLoading={isLoading}>
          Register as Ranger
        </SubmitButton>
      </form>

      <p className="form-switch">
        Already registered?{' '}
        <button
          type="button"
          onClick={() => navigate('/login')}
        >
          Sign in
        </button>
      </p>
    </AuthShell>
  );
}