export default function FormAlert({ type = 'error', children }) {
  if (!children) return null;
  return <p className={`form-alert form-alert--${type}`} role={type === 'error' ? 'alert' : 'status'}>{children}</p>;
}
