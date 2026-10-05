export default function AuthShell({ children, variant = 'login' }) {
  const image = variant === 'register' ? '/reg page pic.png' : '/log page pic.png';
  return (
    <main className="auth-page">
      <section className="auth-card">
        <aside className="auth-image-panel" style={{ backgroundImage: `url("${image}")` }}>
          <img className="auth-logo" src="/logo.jpg" alt="WildGuard" />
          <div className="auth-image-copy">
            <p className="auth-kicker">Community wildlife reporting</p>
            <h1>Protect wildlife.<br />Empower communities.</h1>
            <p>Report sightings, share concerns, and help safeguard nature.</p>
          </div>
        </aside>
        <section className="auth-form-panel">{children}</section>
      </section>
    </main>
  );
}
