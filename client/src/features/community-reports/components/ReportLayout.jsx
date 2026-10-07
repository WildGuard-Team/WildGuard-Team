import CommunityLayout from './CommunityLayout.jsx';
import { useReportDraft } from '../context/useReportDraft.js';

export default function ReportLayout({ title, subtitle, children, navigate, step, restorationMessage, className = '' }) {
  const { draft } = useReportDraft();
  return <CommunityLayout navigate={navigate}><section className={`report-workspace ${className}`}>
    <div className="report-heading"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{step && <p className="report-step">Step {step} of 4</p>}</div>
    {draft.wasRestored && <p className="form-alert form-alert--success report-restoration-notice" role="status">{restorationMessage ?? 'Your saved report details were restored.'}</p>}
    {children}
  </section></CommunityLayout>;
}
