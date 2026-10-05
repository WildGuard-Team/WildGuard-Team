export default function FormField({ error, label, name, children }) {
  return (
    <label className="form-field" htmlFor={name}>
      <span>{label}</span>
      {children}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}
