import CommunityLayout from './CommunityLayout.jsx';
import ReportProgress from './ReportProgress.jsx';
import { useReportDraft } from '../context/useReportDraft.js';

export default function ReportLayout({ title, subtitle, children, navigate, step, restorationMessage, className = '', hero = false, heroEyebrow = title }) {
  const { draft } = useReportDraft();
  return <CommunityLayout navigate={navigate}><section className={`report-workspace ${className}`}>
    <div className="report-heading"><div>{hero && <p className="report-type-hero__eyebrow">{heroEyebrow}</p>}<h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{step && (hero ? <div className="report-type-hero__progress"><p className="report-step">Step {step} of 4</p><ReportProgress currentStep={step} /></div> : <p className="report-step">Step {step} of 4</p>)}</div>
    {draft.wasRestored && <p className="form-alert form-alert--success report-restoration-notice" role="status">{restorationMessage ?? 'Your saved report details were restored.'}</p>}
    {children}
  </section></CommunityLayout>;
}
