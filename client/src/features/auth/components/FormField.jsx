export default function FormField({ children, error, hint, hintError, icon, label, name, trailing }) {
  return (
    <div className="form-field">
      <label htmlFor={name}>{label}</label>
      <span className="input-shell">
        {icon && <span className="input-icon">{icon}</span>}
        {children}
        {trailing}
      </span>
      {error ? <small id={`${name}-error`} className="field-error" role="alert">{error}</small>
        : hint && <small id={`${name}-hint`} className={`field-hint${hintError ? ' field-hint--error' : ''}`} aria-live="polite">{hint}</small>}
    </div>
  );
}
