export default function AuthShell({ children, variant = 'login' }) {
  const image = variant === 'register' ? '/reg page pic.png' : '/log page pic.png';
  return (
    <main className="auth-page">
      <section className="auth-card">
        <aside className="auth-image-panel">
          <img className="auth-photo" src={image} alt="" />
          <a className="auth-logo-link" href="/" aria-label="Go to WildGuard onboarding">
            <img className="auth-logo" src="/logo.jpg" alt="WildGuard" />
          </a>
          <div className="auth-image-copy">
            <p className="auth-kicker">Community wildlife reporting</p>
            <h1>Protect wildlife. Empower communities.</h1>
            <p>Report sightings, share concerns, and help safeguard nature.</p>
          </div>
        </aside>
        <section className="auth-form-panel"><div className={`auth-form-content auth-form-content--${variant}`}>{children}</div></section>
      </section>
    </main>
  );
}
