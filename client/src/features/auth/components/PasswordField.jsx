import { useState } from 'react';
import FormField from './FormField.jsx';

export default function PasswordField({ error, label, name, value, onChange, autoComplete = 'current-password' }) {
  const [visible, setVisible] = useState(false);
  return (
    <FormField label={label} name={name} error={error}>
      <span className="password-input">
        <input
          id={name} name={name} type={visible ? 'text' : 'password'} value={value}
          onChange={onChange} autoComplete={autoComplete} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined}
        />
        <button type="button" className="password-toggle" onClick={() => setVisible(!visible)} aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}>
          {visible ? 'Hide' : 'Show'}
        </button>
      </span>
    </FormField>
  );
}
