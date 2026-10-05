import { useState } from 'react';
import FormField from './FormField.jsx';
import { EyeIcon, EyeOffIcon, LockIcon } from './FieldIcons.jsx';

export default function PasswordField({ autoComplete = 'current-password', error, hint, hintError, label, name, onBlur, onChange, placeholder, touched, value }) {
  const [visible, setVisible] = useState(false);
  const describedBy = error ? `${name}-error` : hint ? `${name}-hint` : undefined;
  return (
    <FormField label={label} name={name} error={error} hint={hint} hintError={hintError} icon={<LockIcon />} trailing={
      <button type="button" className="password-toggle" onClick={() => setVisible((current) => !current)} aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}>
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    }>
      <input
        id={name} name={name} type={visible ? 'text' : 'password'} value={value} onChange={onChange} onBlur={onBlur}
        placeholder={placeholder} autoComplete={autoComplete} aria-invalid={Boolean(error)} aria-describedby={describedBy} data-touched={touched || undefined}
      />
    </FormField>
  );
}
