import CommunityLayout from './CommunityLayout.jsx';

export default function ReportLayout({ title, subtitle, children, navigate, step }) {
  return <CommunityLayout navigate={navigate}><section className="report-workspace">
    <div className="report-heading"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{step && <p className="report-step">Step {step} of 3</p>}</div>
    {children}
  </section></CommunityLayout>;
}
