export default function ReportLayout({ title, children, step }) {
  return <main className="report-page"><section className="report-card">
    <img src="/logo.jpg" alt="WildGuard" className="report-logo" />
    <p className="member-kicker">Community report</p>
    {step && <p className="report-step">Step {step} of 3</p>}
    <h1>{title}</h1>{children}
  </section></main>;
}
